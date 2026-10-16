import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { fetchIndex } from "../../core/data-loader";
import fixture from "../../core/network/__fixtures__/alien3-conversations.json";
import { fixtureMetadata } from "../../core/network/__fixtures__/alien3-network";
import { speedNamed } from "../../core/state/test-helpers";
import { SharedState } from "../../core/state/shared-state";
import * as viewStateContext from "../../core/state/view-state-context";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { clearReducedMotion, setReducedMotion } from "../../core/steps/test-helpers";
import { S3Index, S3Item } from "../../core/types/s3-data";
import { clearDatasetIndexCache } from "../../core/use-dataset-index";
import { collectAllDuration } from "./collect-all-timeline";
import { collectDuration } from "./collect-timeline";
import { ExtractPathways } from "./extract-pathways";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { EXTRACT_MS } from "./pathways-timeline";
import { setupDuration } from "./setup-timeline";

jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;

const SIZES = [10, 8, 6, 2];

function item(id: string, text: string, classification: number): S3Item {
  return {
    id, text, classification,
    sources: { alien3: [0] },
    target: classification,
    target_label: null,
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

const items = fixture.conversations.map(c => item(c.id, c.text, c.classification));
const index: S3Index = { metadata: fixtureMetadata, items };

function showView(state = new ExtractPathwaysState({})) {
  const utils = render(
    <ViewStateProvider viewId="extract-pathways" view={state} shared={new SharedState({})}>
      <ExtractPathways />
    </ViewStateProvider>,
  );
  return { state, ...utils };
}

const button = (name: string) => screen.getByRole("button", { name });
const drawing = (name: string) => screen.getByRole("img", { name });
const LIFTED = "The network, with its 14 hidden neurons lifted out.";
const DECK = "The network's 14 hidden neurons lifted out, and all 20 conversations collected.";
const PATHWAYS = "The 14 hidden neurons, with their loadings on three pathways drawn from all 20 conversations.";
const collectedLabel = (n: number) =>
  `The network, with its 14 hidden neurons lifted out and ${n} conversation${n === 1 ? "" : "s"} collected.`;

describe("ExtractPathways", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockResolvedValue(index);
  });

  afterEach(() => {
    clearReducedMotion();
  });

  it("shows loading, then the step row and the blank network", async () => {
    showView();
    expect(screen.getByRole("heading", { name: "Extract Pathways", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Loading conversations…")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "The network." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Network → Activated Pathways" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "The Network → Activated Pathways" })).toBeInTheDocument();
    expect(button("Setup")).toHaveAttribute("aria-disabled", "false");
    expect(button("Collect a Conversation")).toHaveAttribute("aria-disabled", "false");
    expect(button("Collect All Conversations")).toHaveAttribute("aria-disabled", "false");
    expect(button("Extract Pathways")).toHaveAttribute("aria-disabled", "false");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "true");
  });

  it("shows an error when the conversations can't load", async () => {
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockRejectedValue(new Error("offline"));
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
  });

  it("says to generate the data when the index has no network", async () => {
    const { network: _network, ...metadata } = fixtureMetadata;
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `The conversations could not be loaded: ` +
      "The alien3 data has no network. Run npm run generate:alien to generate it.");
  });

  it("says to generate the data when the fit has no loadings", async () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings: undefined } } };
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The conversations could not be loaded: The alien3 data has no loadings. "
      + "Run npm run generate:alien to generate it.");
  });

  it("says to generate the data again when the view is opened a second time on the same index", async () => {
    const { network: _network, ...metadata } = fixtureMetadata;
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    const alert = "The conversations could not be loaded: " +
      "The alien3 data has no network. Run npm run generate:alien to generate it.";
    const { unmount } = showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(alert);
    unmount();
    // The index is cached now, so this mount starts ready and renders before any onLoaded would run.
    showView();
    expect(screen.getByRole("alert")).toHaveTextContent(alert);
  });

  it("names both shapes when the loadings don't match the network's hidden neurons", async () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const loadings = fit.loadings!.map(pathway => pathway.slice(1));
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings } } };
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The conversations could not be loaded: Expected loadings for 14 neurons on 3 pathways, got 13 rows of 3");
  });

  it("says so when there are no conversations", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    showView();
    expect(await screen.findByText("No conversations.")).toBeInTheDocument();
  });

  it("lifts the hidden neurons out with Setup, and stores it in the view's state", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Setup"));
    expect(drawing(LIFTED)).toBeInTheDocument();
    expect(state.setupDone).toBe(true);
    expect(button("Reset")).toHaveAttribute("aria-disabled", "false");
  });

  it("stores Setup as done when Collect a Conversation comes first", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect a Conversation"));
    expect(drawing(collectedLabel(1))).toBeInTheDocument();
    expect(screen.getByText("Conversation 1")).toBeInTheDocument();
    expect(state.setupDone).toBe(true);
    expect(state.collected).toBe(1);
  });

  it("stops collecting by hand after ten", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByRole("img", { name: "The network." });
    for (let i = 0; i < 10; i++) {
      fireEvent.click(button("Collect a Conversation"));
    }
    expect(drawing(collectedLabel(10))).toBeInTheDocument();
    expect(button("Collect a Conversation")).toHaveAttribute("aria-disabled", "true");
  });

  it("collects no more conversations than were loaded", async () => {
    setReducedMotion(true);
    mockedFetchIndex.mockResolvedValue({ ...index, items: items.slice(0, 3) });
    showView();
    await screen.findByRole("img", { name: "The network." });
    for (let i = 0; i < 3; i++) {
      fireEvent.click(button("Collect a Conversation"));
    }
    expect(button("Collect a Conversation")).toHaveAttribute("aria-disabled", "true");
  });

  it("opens at the stage stored, clamped to the conversations loaded", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: items.slice(0, 3) });
    showView(new ExtractPathwaysState({ setupDone: true, collected: 10 }));
    expect(await screen.findByRole("img", { name: collectedLabel(3) })).toBeInTheDocument();
    expect(screen.getByText("Conversation 3")).toBeInTheDocument();
  });

  it("resets to the blank network", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect a Conversation"));
    fireEvent.click(button("Reset"));
    expect(drawing("The network.")).toBeInTheDocument();
    expect(state.setupDone).toBe(false);
    expect(state.collected).toBe(0);
  });

  it("shows Animate and the speed in the panel's head, and stores Animate in the view's state", async () => {
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    const panel = screen.getByRole("region", { name: "The Network → Activated Pathways" });
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Animate" }));
    expect(state.animate).toBe(false);
    expect(within(panel).getByRole("slider", { name: "Animation speed" })).toBeDisabled();
  });

  it("builds the deck of every conversation with Collect All, and stores it", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect All Conversations"));
    expect(drawing(DECK)).toBeInTheDocument();
    expect(screen.getByText("20 Conversations")).toBeInTheDocument();
    expect(state).toMatchObject({ setupDone: true, collected: 20, deckDone: true, pathwaysDone: false });
    expect(button("Extract Pathways")).toHaveAttribute("aria-disabled", "false");
  });

  it("draws the pathways with Extract Pathways from the start, building the deck on the way", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Extract Pathways"));
    expect(drawing(PATHWAYS)).toBeInTheDocument();
    expect(screen.getByText("Pathway 3")).toBeInTheDocument();
    expect(state).toMatchObject({ setupDone: true, collected: 20, deckDone: true, pathwaysDone: true });
  });

  it("opens on a stored deck at the size of the conversations loaded", async () => {
    showView(new ExtractPathwaysState({ setupDone: true, collected: 800, deckDone: true }));
    expect(await screen.findByRole("img", { name: DECK })).toBeInTheDocument();
    expect(screen.getByText("20 Conversations")).toBeInTheDocument();
  });

  it("starts collecting by hand over again after the deck", async () => {
    setReducedMotion(true);
    const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 20, deckDone: true }));
    await screen.findByRole("img", { name: DECK });
    fireEvent.click(button("Collect a Conversation"));
    expect(drawing(collectedLabel(1))).toBeInTheDocument();
    expect(state).toMatchObject({ collected: 1, deckDone: false });
  });

  describe("animated", () => {
    beforeEach(() => {
      setReducedMotion(false);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it("plays Extract Pathways from the deck, storing the pathways only when it ends", async () => {
      jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 20, deckDone: true }));
      await screen.findByRole("img", { name: DECK });
      jest.useFakeTimers();
      fireEvent.click(button("Extract Pathways"));
      act(() => jest.advanceTimersByTime(3000));
      expect(state.pathwaysDone).toBe(false);
      expect(screen.getByTestId("particles")).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(EXTRACT_MS));
      expect(state.pathwaysDone).toBe(true);
      expect(drawing(PATHWAYS)).toBeInTheDocument();
      expect(screen.queryByTestId("particles")).not.toBeInTheDocument();
    });

    it("plays Setup, then a collection, storing each only when it ends", async () => {
      const { state } = showView();
      await screen.findByRole("img", { name: "The network." });
      jest.useFakeTimers();
      fireEvent.click(button("Setup"));
      expect(button("Setup")).toHaveAttribute("aria-current", "step");
      act(() => jest.advanceTimersByTime(1000));
      expect(state.setupDone).toBe(false);
      act(() => jest.advanceTimersByTime(setupDuration(SIZES)));
      expect(state.setupDone).toBe(true);
      expect(drawing(LIFTED)).toBeInTheDocument();

      fireEvent.click(button("Collect a Conversation"));
      act(() => jest.advanceTimersByTime(1000));
      expect(state.collected).toBe(0);
      expect(screen.getByText("Conversation 1")).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(collectDuration(SIZES, 1)));
      expect(state.collected).toBe(1);
      expect(drawing(collectedLabel(1))).toBeInTheDocument();
    });

    it("stores Setup as done at once with Animate off", async () => {
      const state = new ExtractPathwaysState({});
      state.setAnimate(false);
      showView(state);
      await screen.findByRole("img", { name: "The network." });
      fireEvent.click(button("Setup"));
      expect(state.setupDone).toBe(true);
      expect(drawing(LIFTED)).toBeInTheDocument();
    });

    it("plays Setup's run at the speed in the view's state", async () => {
      const state = new ExtractPathwaysState({});
      state.setSpeed(speedNamed("Fast"));
      showView(state);
      await screen.findByRole("img", { name: "The network." });
      jest.useFakeTimers();
      fireEvent.click(button("Setup"));
      // Fast takes 0.6 of the Med duration, so the run is done well before Med's would be.
      act(() => jest.advanceTimersByTime(setupDuration(SIZES) * 0.7));
      expect(state.setupDone).toBe(true);
    });

    it("finishes Setup's run when Animate is turned off during it", async () => {
      const { state } = showView();
      await screen.findByRole("img", { name: "The network." });
      jest.useFakeTimers();
      fireEvent.click(button("Setup"));
      act(() => jest.advanceTimersByTime(1000));
      expect(state.setupDone).toBe(false);
      fireEvent.click(screen.getByRole("checkbox", { name: "Animate" }));
      act(() => jest.advanceTimersByTime(20));
      expect(state.setupDone).toBe(true);
      expect(drawing(LIFTED)).toBeInTheDocument();
    });

    it("doesn't re-render the view's body while a run plays", async () => {
      showView();
      await screen.findByRole("img", { name: "The network." });
      // The body reads the view's state on every render.
      const bodyRenders = jest.spyOn(viewStateContext, "useViewState");
      jest.useFakeTimers();
      try {
        fireEvent.click(button("Setup"));
        act(() => jest.advanceTimersByTime(1000));
        // The drawing has moved on: the copies are in flight.
        expect(screen.getAllByTestId(/^copy-/).length).toBeGreaterThan(0);
        expect(bodyRenders).not.toHaveBeenCalled();
      } finally {
        bodyRenders.mockRestore();
      }
    });

    it("starts over when Setup is pressed during a collection", async () => {
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 2 }));
      await screen.findByRole("img", { name: collectedLabel(2) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect a Conversation"));
      act(() => jest.advanceTimersByTime(5000));
      fireEvent.click(button("Setup"));
      expect(state.setupDone).toBe(false);
      expect(state.collected).toBe(0);
      expect(screen.queryAllByTestId(/^deck-column-/)).toHaveLength(0);
      act(() => jest.advanceTimersByTime(setupDuration(SIZES) + 50));
      expect(drawing(LIFTED)).toBeInTheDocument();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("drops a run that is playing when the view goes away, keeping where it started", async () => {
      const state = new ExtractPathwaysState({ setupDone: true, collected: 1 });
      const { unmount } = showView(state);
      await screen.findByRole("img", { name: collectedLabel(1) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect a Conversation"));
      act(() => jest.advanceTimersByTime(4000));
      unmount();
      act(() => jest.advanceTimersByTime(10_000));
      expect(state.collected).toBe(1);
      jest.useRealTimers();
      showView(state);
      expect(await screen.findByRole("img", { name: collectedLabel(1) })).toBeInTheDocument();
      expect(screen.queryAllByTestId(/^deck-column-/)).toHaveLength(1);
    });

    it("plays Collect All from three collected, storing the deck only when it ends", async () => {
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 3 }));
      await screen.findByRole("img", { name: collectedLabel(3) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect All Conversations"));
      expect(button("Collect All Conversations")).toHaveAttribute("aria-current", "step");
      act(() => jest.advanceTimersByTime(5000));
      expect(state.deckDone).toBe(false);
      expect(drawing(collectedLabel(3))).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(collectAllDuration(SIZES, 3, 20)));
      expect(state).toMatchObject({ collected: 20, deckDone: true });
      expect(drawing(DECK)).toBeInTheDocument();
    });

    it("starts over when Setup is pressed during Collect All", async () => {
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 3 }));
      await screen.findByRole("img", { name: collectedLabel(3) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect All Conversations"));
      act(() => jest.advanceTimersByTime(5000));
      fireEvent.click(button("Setup"));
      expect(state).toMatchObject({ setupDone: false, collected: 0, deckDone: false });
      expect(screen.queryByTestId("deck")).not.toBeInTheDocument();
      act(() => jest.advanceTimersByTime(collectAllDuration(SIZES, 3, 20)));
      expect(state).toMatchObject({ deckDone: false });
    });

    it("keeps where Collect All started when the view goes away during it", async () => {
      const state = new ExtractPathwaysState({ setupDone: true, collected: 3 });
      const { unmount } = showView(state);
      await screen.findByRole("img", { name: collectedLabel(3) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect All Conversations"));
      act(() => jest.advanceTimersByTime(5000));
      unmount();
      act(() => jest.advanceTimersByTime(60_000));
      expect(state).toMatchObject({ collected: 3, deckDone: false });
    });

    it("finishes Collect All when Animate is turned off during it", async () => {
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 3 }));
      await screen.findByRole("img", { name: collectedLabel(3) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect All Conversations"));
      act(() => jest.advanceTimersByTime(5000));
      fireEvent.click(screen.getByRole("checkbox", { name: "Animate" }));
      act(() => jest.advanceTimersByTime(20));
      expect(state.deckDone).toBe(true);
      expect(drawing(DECK)).toBeInTheDocument();
    });
  });
});
