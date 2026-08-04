import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { App } from "./app";
import { fetchIndex, fetchShap } from "../../shared/data-loader";
import { S3Index, S3FaFit, S3Item } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";
import { DatasetConfig } from "../../shared/datasets/dataset-config";

// The App under test always talks to the network through data-loader; mocking
// it here is what lets these tests control exactly when each dataset's index
// "arrives," which is the whole point of the race-condition and stale-hash
// tests below.
jest.mock("../../shared/data-loader", () => ({
  fetchIndex: jest.fn(),
  fetchShap: jest.fn(),
}));

const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;
const mockedFetchShap = fetchShap as jest.MockedFunction<typeof fetchShap>;

function makeFit(): S3FaFit {
  return {
    source_split: "test",
    n_pathways: 0,
    explained_variance_per_pathway: [],
    pathway_importance: [],
    pathway_score_min: [],
    pathway_score_max: [],
  };
}

function makeItem(id: string, text: string): S3Item {
  return {
    id,
    sources: { test: [0] },
    text,
    target: 1,
    target_label: "positive",
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

function makeIndex(
  fitName: string, item: S3Item, attributes?: AttributeDefinition[],
): S3Index {
  return {
    metadata: { fa_fits: { [fitName]: makeFit() }, review_sets: {}, ...(attributes && { attributes }) },
    items: [item],
  };
}

const yelpItem = makeItem("yelp-item-1", "This is a yelp review about pizza.");
const alienItem = makeItem("alien-item-1", "This is an alien conversation about tarrak.");

// Two hidden entries, because Task 3's sorted-order test needs a case where
// insertion order and sorted order differ.
const alienAttributes: AttributeDefinition[] = [
  { key: "voices_raised", label: "Voices raised", description: "Volume rose.", type: "binary" },
  {
    key: "resource_stressed", label: "Resource stressed",
    description: "Whether the surroundings showed scarcity.", type: "binary", hidden: true,
  },
  {
    key: "young_present", label: "Young present",
    description: "Whether any juvenile was present.", type: "binary", hidden: true,
  },
];

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: Error) => void;
  // No defensive .catch() here: mockedFetchIndex hands this promise straight
  // to the App's fetch-index effect, which attaches its own .then().catch()
  // synchronously during the same render that calls fetchIndex — so the
  // promise never has a tick without a rejection handler attached.
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("App dataset switching", () => {
  let pending: Record<string, Deferred<S3Index>[]>;

  beforeEach(() => {
    pending = {};
    mockedFetchIndex.mockReset();
    mockedFetchShap.mockReset();
    mockedFetchIndex.mockImplementation((config: DatasetConfig) => {
      const entry = deferred<S3Index>();
      (pending[config.id] ??= []).push(entry);
      return entry.promise;
    });
    // Not exercised by these tests: no fixture item declares has_shap.
    mockedFetchShap.mockRejectedValue(new Error("fetchShap should not be called in these tests"));
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
  });

  async function resolveNext(id: string, index: S3Index) {
    const next = pending[id]?.shift();
    if (!next) throw new Error(`No pending fetchIndex call for "${id}"`);
    await act(async () => {
      next.resolve(index);
      // Flush the microtask queue so the effect's .then body runs and its
      // resulting state updates commit before the next assertion.
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function rejectNext(id: string, message: string) {
    const next = pending[id]?.shift();
    if (!next) throw new Error(`No pending fetchIndex call for "${id}"`);
    await act(async () => {
      next.reject(new Error(message));
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("applies a dataset and item named by a hashchange", async () => {
    render(<App />);
    await resolveNext("yelp", makeIndex("yelp-fit", yelpItem));

    await act(async () => {
      window.location.hash = `#dataset=alien&item=${alienItem.id}`;
      window.dispatchEvent(new Event("hashchange"));
    });
    await resolveNext("alien", makeIndex("alien-fa-4", alienItem));

    expect(screen.getByRole("combobox")).toHaveValue("alien");
    // The restored item is selected rather than showing the empty state: its
    // text now appears twice — once in the results-list snippet, and again in
    // the item panel that only renders once something is selected. The empty
    // state's noun is dataset-driven, so match on the sentence shape rather
    // than a hard-coded "review" — otherwise this assertion would trivially
    // pass for the alien dataset (whose empty state says "conversation")
    // regardless of whether an item was actually selected.
    expect(screen.queryByText(/Select a \S+ from the results/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(alienItem.text)).toHaveLength(2);
  });

  it("does not resurrect the previous dataset's search query on a dropdown switch", async () => {
    render(<App />);
    await resolveNext("yelp", makeIndex("yelp-fit", yelpItem));

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "stars:5" } });
    expect(screen.getByRole("textbox")).toHaveValue("stars:5");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "alien" } });
    await resolveNext("alien", makeIndex("alien-fa-4", alienItem));

    expect(screen.getByRole("combobox")).toHaveValue("alien");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  // No test here for the index-fetch effect's stale-response guard (the
  // `let cancelled = false` / `return () => { cancelled = true; }` pair in
  // the fetch-index effect in app.tsx) — see the fix report for why a
  // non-contrived one could not be built in this codebase, and what was tried.

  it("keeps the dataset dropdown available after a load error, so switching datasets recovers", async () => {
    render(<App />);
    await rejectNext("yelp", "index fetch failed");
    expect(screen.getByText(/Error loading data: index fetch failed/i)).toBeInTheDocument();

    // The dropdown must still be reachable: it is the user's only recovery
    // path out of the error state (see finding 1 of the final-fixes review).
    expect(screen.getByRole("combobox")).toHaveValue("yelp");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "alien" } });
    await resolveNext("alien", makeIndex("alien-fa-4", alienItem));

    expect(screen.queryByText(/Error loading data/i)).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("alien");
    expect(screen.getAllByText(alienItem.text)).toHaveLength(1);
  });

  it("routes a generated index whose attributes collide with a derived attribute to the error state", async () => {
    render(<App />);
    await resolveNext("yelp", makeIndex("yelp-fit", yelpItem));

    const badIndex = makeIndex("alien-fa-4", alienItem);
    badIndex.metadata.attributes = [
      {
        key: "target", label: "Duplicate of a derived attribute", description: "collides on purpose",
        type: "binary", valueLabels: { 0: "no", 1: "yes" },
      },
    ];
    await act(async () => {
      window.location.hash = "#dataset=alien";
      window.dispatchEvent(new Event("hashchange"));
    });
    await resolveNext("alien", badIndex);

    expect(screen.getByText(/Error loading data/i)).toBeInTheDocument();
    expect(screen.getByText(/Duplicate attribute key "target"/i)).toBeInTheDocument();
  });

  it("renders no trace of an uncommissioned attribute anywhere in the app", async () => {
    // Covers the chips and the search help dialog together, and will also catch
    // a future surface that renders attributes without anyone remembering this
    // constraint exists.
    window.location.hash = "#dataset=alien";
    render(<App />);
    await resolveNext("alien", makeIndex("alien-fa-4", alienItem, alienAttributes));

    // Neither surface that renders attribute labels is on screen by default:
    // no item is selected (no chips) and the search help dialog starts closed.
    // Open it so the attribute list actually renders into the document.
    fireEvent.click(screen.getByLabelText("Search help"));

    expect(document.body.textContent).not.toContain("resource_stressed");
    expect(document.body.textContent).not.toContain("Resource stressed");
    expect(document.body.textContent).not.toContain("showed scarcity");
    // The visible one is still there, so this is not passing by rendering nothing.
    expect(document.body.textContent).toContain("Voices raised");
  });

  describe("commissioning", () => {
    async function renderAlien(hash = "#dataset=alien") {
      window.location.hash = hash;
      render(<App />);
      await resolveNext("alien", makeIndex("alien-fa-4", alienItem, alienAttributes));
    }

    it("commissions an attribute and writes it to the hash", async () => {
      await renderAlien();
      fireEvent.click(screen.getByRole("button", { name: /codings/i }));
      fireEvent.click(screen.getByTestId("commission-resource_stressed"));
      // Close the Codings dialog before checking visibility elsewhere: its own
      // "Commissioned in this session" list would otherwise satisfy the
      // assertion below regardless of whether applyCommissions actually made
      // the attribute visible to the rest of the app. The search help dialog
      // (opened next) renders dataset.attributes — the real surface — the
      // same way the pinning test above proves an uncommissioned attribute is
      // absent from it.
      // "expanded: true" (rather than another name match on /codings/i) is
      // what picks the trigger and not the "Reset codings" button that now
      // also exists inside the open dialog.
      fireEvent.click(screen.getByRole("button", { name: /codings/i, expanded: true }));

      fireEvent.click(screen.getByLabelText("Search help"));
      expect(document.body.textContent).toContain("Resource stressed");
      expect(window.location.hash).toContain("coded=resource_stressed");
    });

    it("applies a commissioned attribute named in the hash on load", async () => {
      await renderAlien("#dataset=alien&coded=resource_stressed");
      // Assert via the search help dialog (dataset.attributes) rather than the
      // Codings dialog: the Codings dialog would show "Resource stressed" in
      // its "Commissioned in this session" list purely because the key was
      // parsed out of the hash into commissioned state, regardless of whether
      // applyCommissions ever made the attribute visible to the explorer. The
      // search help dialog is never opened by the Codings dialog, so this
      // cannot be satisfied by the wrong surface.
      fireEvent.click(screen.getByLabelText("Search help"));
      expect(document.body.textContent).toContain("Resource stressed");
    });

    it("writes commissioned keys in sorted order", async () => {
      // young_present first, so insertion order and sorted order differ and the
      // test would fail if the keys were written in the order they were clicked.
      await renderAlien();
      fireEvent.click(screen.getByRole("button", { name: /codings/i }));
      fireEvent.click(screen.getByTestId("commission-young_present"));
      fireEvent.click(screen.getByTestId("commission-resource_stressed"));
      expect(window.location.hash).toContain("coded=resource_stressed,young_present");
    });

    it("drops coded from the hash on reset", async () => {
      await renderAlien("#dataset=alien&coded=resource_stressed");
      fireEvent.click(screen.getByRole("button", { name: /codings/i }));
      fireEvent.click(screen.getByRole("button", { name: /reset/i }));
      expect(window.location.hash).not.toContain("coded=");
    });

    it("clears commissions when the dataset changes", async () => {
      await renderAlien("#dataset=alien&coded=resource_stressed");
      fireEvent.change(screen.getByLabelText("Dataset:"), { target: { value: "yelp" } });
      await resolveNext("yelp", makeIndex("yelp-fit", yelpItem));
      expect(window.location.hash).not.toContain("coded=");
    });

    it("ignores a coded key that names no attribute of this dataset", async () => {
      // A stale or hand-edited link should show something rather than erroring,
      // and the junk key must not survive into the URL the app writes back.
      await renderAlien("#dataset=alien&coded=not_a_real_key");
      expect(screen.getByText("Pathway Explorer")).toBeInTheDocument();
      expect(window.location.hash).not.toContain("not_a_real_key");
    });

    it("does not let a junk coded key arriving via hashchange survive into the url", async () => {
      // Same guarantee as the load-time version above, but for the hashchange
      // path (Back/Forward, or a link clicked from within the app) rather than
      // the initial mount — the two paths sanitize independently.
      await renderAlien();
      act(() => {
        window.location.hash = "#dataset=alien&coded=not_a_real_key";
        window.dispatchEvent(new Event("hashchange"));
      });
      expect(window.location.hash).not.toContain("not_a_real_key");
    });

    it("clears commissions when a hashchange drops coded", async () => {
      // The brief calls this out by name: Back to a URL without coded= must
      // clear the set, or the URL and the app disagree about what is
      // commissioned. Asserted through the search help dialog (dataset.attributes)
      // for the same reason the commissioning tests above are: the Codings
      // dialog's own list would not distinguish "really cleared" from
      // "state.commissioned is stale but nothing re-rendered."
      await renderAlien("#dataset=alien&coded=resource_stressed");
      act(() => {
        window.location.hash = "#dataset=alien";
        window.dispatchEvent(new Event("hashchange"));
      });
      fireEvent.click(screen.getByLabelText("Search help"));
      expect(document.body.textContent).not.toContain("Resource stressed");
      // Positive control: still-visible attributes are still there, so the
      // assertion above is not passing because the help dialog failed to open.
      expect(document.body.textContent).toContain("Voices raised");
    });

    it("shows no codings button for a dataset that hides nothing", async () => {
      render(<App />);
      await resolveNext("yelp", makeIndex("yelp-fit", yelpItem));
      expect(screen.queryByRole("button", { name: /codings/i })).toBeNull();
    });
  });
});
