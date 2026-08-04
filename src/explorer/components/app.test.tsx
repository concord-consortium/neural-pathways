import React from "react";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { App } from "./app";
import { fetchIndex, fetchShap } from "../../shared/data-loader";
import { S3Index, S3FaFit, S3Item } from "../../shared/types/s3-data";
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

function makeIndex(fitName: string, item: S3Item): S3Index {
  return {
    metadata: { fa_fits: { [fitName]: makeFit() }, review_sets: {} },
    items: [item],
  };
}

const yelpItem = makeItem("yelp-item-1", "This is a yelp review about pizza.");
const alienItem = makeItem("alien-item-1", "This is an alien conversation about tarrak.");

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
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
    // the item panel that only renders once something is selected.
    expect(screen.queryByText(/Select a review/i)).not.toBeInTheDocument();
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
});
