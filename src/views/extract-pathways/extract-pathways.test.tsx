import React from "react";
import { fromSnapshot, SnapshotInOf } from "mobx-keystone";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { RULE_COLOR } from "../../core/colors";
import { fetchIndex } from "../../core/data-loader";
import fixture from "../../core/network/__fixtures__/alien3-messages.json";
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
import pathwaysDoneSnapshot from "./__fixtures__/extract-pathways-state.v1-pathways-done.json";
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

const items = fixture.messages.map(c => item(c.id, c.text, c.classification));
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
const DECK = "The network's 14 hidden neurons lifted out, and all 20 messages collected.";
const PATHWAYS = "The 14 hidden neurons, with their loadings on three pathways drawn from all 20 messages.";
const collectedLabel = (n: number) =>
  `The network, with its 14 hidden neurons lifted out and ${n} message${n === 1 ? "" : "s"} collected.`;

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
    expect(screen.getByRole("heading", { name: "Extract the Neural Pathways", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Loading messages…")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "The network." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Neural Network → Activated Pathways" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "The Neural Network → Activated Pathways" })).toBeInTheDocument();
    expect(button("Setup")).toHaveAttribute("aria-disabled", "false");
    expect(button("Collect a Message")).toHaveAttribute("aria-disabled", "false");
    expect(button("Collect All Messages")).toHaveAttribute("aria-disabled", "false");
    expect(button("Extract Pathways")).toHaveAttribute("aria-disabled", "false");
    expect(button("Reset")).toHaveAttribute("aria-disabled", "true");
  });

  it("shows an error when the messages can't load", async () => {
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
      `The messages could not be shown: ` +
      "The alien3 data has no network. Run npm run generate:alien to generate it.");
  });

  it("says to generate the data when the fit has no loadings", async () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings: undefined } } };
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The messages could not be shown: The alien3 data has no loadings. "
      + "Run npm run generate:alien to generate it.");
  });

  it("says to generate the data again when the view is opened a second time on the same index", async () => {
    const { network: _network, ...metadata } = fixtureMetadata;
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    const alert = "The messages could not be shown: " +
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
      "The messages could not be shown: Expected loadings for 14 neurons on 3 pathways, got 13 rows of 3");
  });

  it("says so when there are no messages", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    showView();
    expect(await screen.findByText("No messages.")).toBeInTheDocument();
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

  it("stores Setup as done when Collect a Message comes first", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect a Message"));
    expect(drawing(collectedLabel(1))).toBeInTheDocument();
    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(state.setupDone).toBe(true);
    expect(state.collected).toBe(1);
  });

  it("stops collecting by hand after ten", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByRole("img", { name: "The network." });
    for (let i = 0; i < 10; i++) {
      fireEvent.click(button("Collect a Message"));
    }
    expect(drawing(collectedLabel(10))).toBeInTheDocument();
    expect(button("Collect a Message")).toHaveAttribute("aria-disabled", "true");
  });

  it("collects no more messages than were loaded", async () => {
    setReducedMotion(true);
    mockedFetchIndex.mockResolvedValue({ ...index, items: items.slice(0, 3) });
    showView();
    await screen.findByRole("img", { name: "The network." });
    for (let i = 0; i < 3; i++) {
      fireEvent.click(button("Collect a Message"));
    }
    expect(button("Collect a Message")).toHaveAttribute("aria-disabled", "true");
  });

  it("opens at the stage stored, clamped to the messages loaded", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: items.slice(0, 3) });
    showView(new ExtractPathwaysState({ setupDone: true, collected: 10 }));
    expect(await screen.findByRole("img", { name: collectedLabel(3) })).toBeInTheDocument();
    expect(screen.getByText("Message 3")).toBeInTheDocument();
  });

  it("resets to the blank network", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect a Message"));
    fireEvent.click(button("Reset"));
    expect(drawing("The network.")).toBeInTheDocument();
    expect(state.setupDone).toBe(false);
    expect(state.collected).toBe(0);
  });

  it("shows Animate and the speed in the panel's head, and stores Animate in the view's state", async () => {
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    const panel = screen.getByRole("region", { name: "The Neural Network → Activated Pathways" });
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Animate" }));
    expect(state.animate).toBe(false);
    expect(within(panel).getByRole("slider", { name: "Animation speed" })).toBeDisabled();
  });

  it("shows the activation legend in the panel's head", async () => {
    showView();
    await screen.findByRole("img", { name: "The network." });
    const panel = screen.getByRole("region", { name: "The Neural Network → Activated Pathways" });
    expect(within(panel).getByText("Neuron Activation")).toBeInTheDocument();
  });

  it("keeps the loading legend out of the layout until the pathways are drawn", async () => {
    showView(new ExtractPathwaysState({ setupDone: true, collected: 20, deckDone: true, pathwaysDone: false }));
    await screen.findByRole("img", { name: DECK });
    expect(screen.getByText("Loading")).not.toBeVisible();
  });

  it("shows the loading legend once the pathways are drawn", async () => {
    showView(fromSnapshot(ExtractPathwaysState, pathwaysDoneSnapshot as SnapshotInOf<ExtractPathwaysState>));
    await screen.findByRole("img", { name: PATHWAYS });
    expect(screen.getByText("Loading")).toBeVisible();
  });

  describe("picking", () => {
    const pathwayBox = () => screen.getByRole("button", { name: /^Pathway 2, show its loadings/ });
    const pressedButtons = () => screen.queryAllByRole("button", { pressed: true });

    async function showPathways() {
      showView(fromSnapshot(ExtractPathwaysState, pathwaysDoneSnapshot as SnapshotInOf<ExtractPathwaysState>));
      await screen.findByRole("img", { name: PATHWAYS });
    }

    it("has no targets before the pathways are done", async () => {
      showView(new ExtractPathwaysState({ setupDone: true, collected: 20, deckDone: true }));
      await screen.findByRole("img", { name: DECK });
      expect(screen.queryByRole("button", { name: /show its loadings/ })).not.toBeInTheDocument();
    });

    it("clears the pick when any step is pressed, even Extract Pathways again with Animate off", async () => {
      setReducedMotion(true);
      await showPathways();
      fireEvent.click(pathwayBox());
      expect(pathwayBox()).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(button("Extract Pathways"));
      expect(pathwayBox()).toHaveAttribute("aria-pressed", "false");
    });

    it("clears the pick on Reset", async () => {
      setReducedMotion(true);
      await showPathways();
      fireEvent.click(pathwayBox());
      fireEvent.click(button("Reset"));
      await screen.findByRole("img", { name: "The network." });
      fireEvent.click(button("Extract Pathways"));
      expect(pressedButtons()).toHaveLength(0);
    });

    it("describes the pick in the drawing's name", async () => {
      await showPathways();
      fireEvent.click(pathwayBox());
      const name = / Pathway 2's loadings: Hidden Layer 1 Neuron 1 [+\u2212]\d\.\d\d, /;
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
    });
  });

  it("builds the deck of every message with Collect All, and stores it", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Collect All Messages"));
    expect(drawing(DECK)).toBeInTheDocument();
    expect(screen.getByText("20 Messages")).toBeInTheDocument();
    expect(state).toMatchObject({ setupDone: true, collected: 20, deckDone: true, pathwaysDone: false });
    expect(button("Extract Pathways")).toHaveAttribute("aria-disabled", "false");
  });

  it("draws the pathways with Extract Pathways from the start, jumping to the deck first", async () => {
    setReducedMotion(true);
    const { state } = showView();
    await screen.findByRole("img", { name: "The network." });
    fireEvent.click(button("Extract Pathways"));
    expect(drawing(PATHWAYS)).toBeInTheDocument();
    expect(screen.getByText("Pathway 3")).toBeInTheDocument();
    expect(state).toMatchObject({ setupDone: true, collected: 20, deckDone: true, pathwaysDone: true });
  });

  it("opens on a stored deck at the size of the messages loaded", async () => {
    showView(new ExtractPathwaysState({ setupDone: true, collected: 800, deckDone: true }));
    expect(await screen.findByRole("img", { name: DECK })).toBeInTheDocument();
    expect(screen.getByText("20 Messages")).toBeInTheDocument();
  });

  it("starts collecting by hand over again after the deck", async () => {
    setReducedMotion(true);
    const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 20, deckDone: true }));
    await screen.findByRole("img", { name: DECK });
    fireEvent.click(button("Collect a Message"));
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

    it("plays Extract Pathways with no bar muted after a pick was cleared by Reset", async () => {
      jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      showView(fromSnapshot(ExtractPathwaysState, pathwaysDoneSnapshot as SnapshotInOf<ExtractPathwaysState>));
      await screen.findByRole("img", { name: PATHWAYS });
      fireEvent.click(screen.getByRole("button", { name: /^Pathway 2, show its loadings/ }));
      expect(screen.getAllByTestId("pathway-line")).toHaveLength(14);
      jest.useFakeTimers();
      fireEvent.click(button("Reset"));
      act(() => jest.advanceTimersByTime(0));
      fireEvent.click(button("Extract Pathways"));
      act(() => jest.advanceTimersByTime(3000));
      expect(screen.getByTestId("particles")).toBeInTheDocument();
      const fills = screen.getAllByTestId("loading-bar").map(bar => bar.getAttribute("fill"));
      expect(fills).not.toContain(RULE_COLOR);
      act(() => jest.advanceTimersByTime(EXTRACT_MS));
      expect(drawing(PATHWAYS)).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
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

      fireEvent.click(button("Collect a Message"));
      act(() => jest.advanceTimersByTime(1000));
      expect(state.collected).toBe(0);
      expect(screen.getByText("Message 1")).toBeInTheDocument();
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
      // Fast takes 0.6 of the Medium duration, so the run is done well before Medium's would be.
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
      fireEvent.click(button("Collect a Message"));
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
      fireEvent.click(button("Collect a Message"));
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
      fireEvent.click(button("Collect All Messages"));
      expect(button("Collect All Messages")).toHaveAttribute("aria-current", "step");
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
      fireEvent.click(button("Collect All Messages"));
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
      fireEvent.click(button("Collect All Messages"));
      act(() => jest.advanceTimersByTime(5000));
      unmount();
      act(() => jest.advanceTimersByTime(60_000));
      expect(state).toMatchObject({ collected: 3, deckDone: false });
    });

    it("finishes Collect All when Animate is turned off during it", async () => {
      const { state } = showView(new ExtractPathwaysState({ setupDone: true, collected: 3 }));
      await screen.findByRole("img", { name: collectedLabel(3) });
      jest.useFakeTimers();
      fireEvent.click(button("Collect All Messages"));
      act(() => jest.advanceTimersByTime(5000));
      fireEvent.click(screen.getByRole("checkbox", { name: "Animate" }));
      act(() => jest.advanceTimersByTime(20));
      expect(state.deckDone).toBe(true);
      expect(drawing(DECK)).toBeInTheDocument();
    });
  });
});
