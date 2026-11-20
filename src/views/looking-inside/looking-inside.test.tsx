import React from "react";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as messageCard from "../../core/message-card/message-card";
import { fetchIndex } from "../../core/data-loader";
import { phaseDuration } from "../../core/network-diagram/forward-pass-phases";
import fixture from "../../core/network/__fixtures__/alien3-messages.json";
import { fixtureMetadata } from "../../core/network/__fixtures__/alien3-network";
import { speedNamed } from "../../core/state/test-helpers";
import { SharedState } from "../../core/state/shared-state";
import { LookingInsideState } from "./looking-inside-state";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { clearReducedMotion, setReducedMotion } from "../../core/steps/test-helpers";
import { S3Index, S3Item } from "../../core/types/s3-data";
import { clearDatasetIndexCache } from "../../core/use-dataset-index";
import { LookingInside } from "./looking-inside";

jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;

function item(id: string, text: string, classification: number): S3Item {
  return {
    id, text, classification,
    sources: { alien3: [0] },
    target: classification,
    target_label: null,
    observation: `Notes on ${id}.`,
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

// The first and third are classified Wait, the second Approach.
const items = [0, 6, 1].map(i => fixture.messages[i])
  .map(c => item(c.id, c.text, c.classification));
const ids = items.map(i => i.id);
const index: S3Index = { metadata: fixtureMetadata, items };

function viewWith(shared: SharedState, state = new LookingInsideState({})) {
  return (
    <ViewStateProvider viewId="looking-inside" view={state} shared={shared}>
      <LookingInside />
    </ViewStateProvider>
  );
}

function showView(shared = new SharedState({}), state = new LookingInsideState({})) {
  render(viewWith(shared, state));
  return shared;
}

const filterBox = () => screen.getByRole("textbox", { name: "Filter" });
const typeQuery = (text: string) => fireEvent.change(filterBox(), { target: { value: text } });
const wordsOf = (i: number) => items[i].text.split(/\s+/).join(" ");
const card = () => screen.getByRole("region", { name: "Message" });
const notesToggle = () => screen.getByRole("button", { name: "Observation notes" });

/** A state with the notes open, so a test can read them. */
function openNotes() {
  const state = new LookingInsideState({});
  state.setNotesOpen(true);
  return state;
}

describe("LookingInside", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockResolvedValue(index);
  });

  afterEach(() => {
    clearReducedMotion();
  });

  it("shows loading, then the first message and the network", async () => {
    showView();
    expect(screen.getByRole("heading", { name: "Looking Inside a Neural Network" })).toBeInTheDocument();
    expect(screen.getByText("Loading messages…")).toBeInTheDocument();
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(card()).toHaveTextContent(wordsOf(0));
    expect(screen.getByRole("heading", { name: "The Neural Network" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Network diagram" })).toBeInTheDocument();
  });

  it("stores the shared message once the messages arrive", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    expect(shared.messageId).toBe(ids[0]);
  });

  it("moves the shared message with next and previous", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Message 2 of 3");
    expect(shared.messageId).toBe(ids[1]);
    fireEvent.click(screen.getByRole("button", { name: "Previous message" }));
    expect(shared.messageId).toBe(ids[0]);
  });

  it("shows the message's label and notes", async () => {
    showView(new SharedState({}), openNotes());
    await screen.findByText("1 / 3");
    expect(within(card()).getByText("wait")).toHaveClass("actual-label__pill");
    expect(within(card()).getByText(`Notes on ${ids[0]}.`)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    expect(within(card()).getByText("approach")).toHaveClass("actual-label__pill");
    expect(within(card()).getByText(`Notes on ${ids[1]}.`)).toBeVisible();
  });

  it("starts with the notes closed", async () => {
    showView();
    await screen.findByText("1 / 3");
    expect(notesToggle()).toHaveAttribute("aria-expanded", "false");
    expect(within(card()).getByText(`Notes on ${ids[0]}.`)).not.toBeVisible();
  });

  it("keeps the notes open in the view's state, across messages and remounts", async () => {
    const shared = new SharedState({});
    const state = new LookingInsideState({});
    const { unmount } = render(viewWith(shared, state));
    await screen.findByText("1 / 3");
    fireEvent.click(notesToggle());
    expect(state.notesOpen).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    expect(notesToggle()).toHaveAttribute("aria-expanded", "true");
    unmount();
    render(viewWith(shared, state));
    expect(await screen.findByRole("button", { name: "Observation notes" })).toHaveAttribute("aria-expanded", "true");
  });

  // Volatile: see docs/view-state.md.
  it("doesn't save whether the notes are open", async () => {
    const state = openNotes();
    expect(getSnapshot(state)).not.toHaveProperty("notesOpen");
    expect(fromSnapshot(LookingInsideState, getSnapshot(state)).notesOpen).toBe(false);
  });

  it("draws the network for the message shown", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByText("1 / 3");
    const stepToAnswer = () => fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Approach/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous message" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
  });

  it("names the network's section by its heading", async () => {
    showView();
    await screen.findByText("1 / 3");
    expect(screen.getByRole("region", { name: "The Neural Network" })).toBeInTheDocument();
  });

  it("opens straight on the saved message when the messages are already loaded", async () => {
    const shared = new SharedState({});
    const { unmount } = render(viewWith(shared));
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    unmount();
    showView(shared);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.queryByText("Loading messages…")).not.toBeInTheDocument();
  });

  it("opens on the saved message", async () => {
    showView(new SharedState({ messageId: ids[2] }));
    expect(await screen.findByText("3 / 3")).toBeInTheDocument();
  });

  it("falls back to the first message for an unknown id", async () => {
    const shared = showView(new SharedState({ messageId: "000000000000" }));
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(shared.messageId).toBe(ids[0]);
  });

  it("shows an error when the messages can't load", async () => {
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockRejectedValue(new Error("offline"));
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent("The messages could not be loaded: offline");
  });

  it("says to generate the data when the index has no network", async () => {
    const { network: _network, ...metadata } = index.metadata;
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `The messages could not be shown: ` +
      "The alien3 data has no network. Run npm run generate:alien to generate it.");
  });

  it("says to generate the data again when the view is opened a second time on the same index", async () => {
    const { network: _network, ...metadata } = index.metadata;
    mockedFetchIndex.mockResolvedValue({ ...index, metadata });
    const alert = "The messages could not be shown: " +
      "The alien3 data has no network. Run npm run generate:alien to generate it.";
    const { unmount } = render(viewWith(new SharedState({})));
    expect(await screen.findByRole("alert")).toHaveTextContent(alert);
    unmount();
    // The index is cached now, so this mount starts ready and renders before any onLoaded would run.
    showView();
    expect(screen.getByRole("alert")).toHaveTextContent(alert);
  });

  it("says the messages couldn't be shown when correcting the message fails", async () => {
    const shared = new SharedState({});
    jest.spyOn(shared, "ensureValidMessage").mockImplementation(() => {
      throw new Error("bad list");
    });
    showView(shared);
    expect(await screen.findByRole("alert")).toHaveTextContent("The messages could not be shown: bad list");
  });

  it("says so when there are no messages, and leaves the saved message alone", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    const shared = showView(new SharedState({ messageId: ids[1] }));
    expect(await screen.findByText("No messages.")).toBeInTheDocument();
    expect(shared.messageId).toBe(ids[1]);
  });

  it("reveals the network's answer at Step 4", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 4" })).toHaveAttribute("aria-current", "step");
  });

  it("shows Animate and the speed in the network's head", async () => {
    showView();
    await screen.findByText("1 / 3");
    const network = screen.getByRole("region", { name: "The Neural Network" });
    expect(within(network).getByRole("checkbox", { name: "Animate" })).toBeChecked();
    expect(within(network).getByRole("slider", { name: "Animation speed" }))
      .toHaveAttribute("aria-valuetext", "Medium");
  });

  it("stores Animate in the view's state", async () => {
    const state = new LookingInsideState({});
    showView(undefined, state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("checkbox", { name: "Animate" }));
    expect(state.animate).toBe(false);
    expect(screen.getByRole("slider", { name: "Animation speed" })).toBeDisabled();
  });

  it("stores a step's end marker at once with Animate off", async () => {
    setReducedMotion(false);
    const state = new LookingInsideState({});
    state.setAnimate(false);
    showView(undefined, state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
    expect(state.marker(ids[0])).toBe(4);
  });

  it("plays a step's run at the speed in the view's state", async () => {
    const state = new LookingInsideState({});
    state.setSpeed(speedNamed("Fast"));
    showView(undefined, state);
    await screen.findByText("1 / 3");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
      // Fast takes 0.6 of the Med duration, so the run is done well before Med's would be.
      act(() => jest.advanceTimersByTime(phaseDuration(4, [10, 8, 6, 2]) * 0.7));
      expect(state.marker(ids[0])).toBe(4);
    } finally {
      jest.useRealTimers();
    }
  });

  it("starts a message not stepped yet with nothing done", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Step 2" })).not.toHaveAttribute("aria-current");
  });

  it("brings a message's steps back when returning to it", async () => {
    setReducedMotion(true);
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous message" }));
    expect(screen.getByRole("button", { name: "Step 4" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
  });

  it("keeps the steps done for each message in the view's state", async () => {
    setReducedMotion(true);
    const state = new LookingInsideState({});
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Next message" }));
    fireEvent.click(screen.getByRole("button", { name: "Step 1" }));
    expect(state.markerByMessage).toEqual({ [ids[0]]: 3, [ids[1]]: 1 });
  });

  it("drops a run that is playing when the message changes, keeping the marker before", async () => {
    const state = new LookingInsideState({});
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      act(() => jest.advanceTimersByTime(500));
      fireEvent.click(screen.getByRole("button", { name: "Next message" }));
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(state.markerByMessage).toEqual({ [ids[0]]: 1 });
      fireEvent.click(screen.getByRole("button", { name: "Previous message" }));
      expect(screen.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
    } finally {
      jest.useRealTimers();
    }
  });

  it("resets the message shown, and only that one", async () => {
    setReducedMotion(true);
    const state = new LookingInsideState({ markerByMessage: { [ids[1]]: 2 } });
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    for (const step of [1, 2, 3, 4]) {
      expect(screen.getByRole("button", { name: `Step ${step}` })).not.toHaveAttribute("aria-current");
    }
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
    expect(state.markerByMessage).toEqual({ [ids[1]]: 2 });
  });

  it("stops a run that is playing when the view unmounts, keeping the marker before", async () => {
    const state = new LookingInsideState({});
    const { unmount } = render(viewWith(new SharedState({}), state));
    await screen.findByText("1 / 3");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      act(() => jest.advanceTimersByTime(500));
      unmount();
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(state.markerByMessage).toEqual({ [ids[0]]: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it("doesn't re-render the message card while a run plays", async () => {
    showView();
    await screen.findByText("1 / 3");
    const cardRenders = jest.spyOn(messageCard, "MessageCard");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      act(() => jest.advanceTimersByTime(1000));
      // The diagram has moved on: the first embedding unit's edges are drawn.
      expect(screen.getAllByTestId(/^edge-near-0-0-/).length).toBeGreaterThan(0);
      expect(cardRenders).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      cardRenders.mockRestore();
    }
  });

  it("opens a message at the marker stored for it", async () => {
    showView(new SharedState({}), new LookingInsideState({ markerByMessage: { [ids[0]]: 2 } }));
    await screen.findByText("1 / 3");
    expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-current", "step");
  });

  describe("the filter", () => {
    it("shows the filter, counting every message", async () => {
      showView();
      await screen.findByText("1 / 3");
      expect(filterBox()).toHaveAccessibleDescription("3");
    });

    it("narrows the messages as the student types, without storing the query", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      typeQuery("n:>1");
      expect(filterBox()).toHaveAccessibleDescription("2 of 3");
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      expect(card()).toHaveTextContent(wordsOf(1));
      expect(shared.query).toBeUndefined();
      expect(shared.messageId).toBe(ids[0]);
    });

    it("stores the query and corrects the message on Enter", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      typeQuery("n:>1");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(shared.query).toBe("n:>1");
      expect(shared.messageId).toBe(ids[1]);
    });

    it("steps through only the matches", async () => {
      const shared = showView(new SharedState({ query: "n:>1" }));
      await screen.findByText("1 / 2");
      fireEvent.click(screen.getByRole("button", { name: "Next message" }));
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
      expect(shared.messageId).toBe(ids[2]);
      expect(screen.getByRole("button", { name: "Next message" })).toHaveAttribute("aria-disabled", "true");
    });

    it("shows the matching message's own words, not the one at its place in the list", async () => {
      showView(new SharedState({ query: "n:3" }));
      await screen.findByText("1 / 1");
      expect(card()).toHaveTextContent(wordsOf(2));
    });

    it("draws the network for the matching message, not the one at its place in the list", async () => {
      setReducedMotion(true);
      showView(new SharedState({ query: "n:2" }));
      await screen.findByText("1 / 1");
      fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
      expect(screen.getByRole("img", { name: /predicts Approach/ })).toBeInTheDocument();
    });

    it("stores a draft before Next moves, when focus leaves the box", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      filterBox().focus();
      typeQuery("n:>1");
      const next = screen.getByRole("button", { name: "Next message" });
      act(() => next.focus());
      fireEvent.click(next);
      expect(shared.query).toBe("n:>1");
      expect(shared.messageId).toBe(ids[2]);
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });

    it("says so in the card when nothing matches, leaving out the steps and the network", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      // The card stays, so its status is still in the page to announce the way back.
      const status = within(card()).getByRole("status");
      typeQuery("n:9");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(filterBox()).toHaveAccessibleDescription("0 of 3");
      expect(card()).toHaveTextContent("No messages match that search.");
      expect(within(card()).getByRole("status")).toBe(status);
      expect(screen.queryByRole("button", { name: "Step 1" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "The Neural Network" })).not.toBeInTheDocument();
      expect(shared.messageId).toBe(ids[0]);
    });

    it("brings the same message back, at its marker, when the query is cleared", async () => {
      setReducedMotion(true);
      const shared = showView(new SharedState({ messageId: ids[1] }));
      await screen.findByText("2 / 3");
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      typeQuery("n:9");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      typeQuery("");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
      expect(shared.messageId).toBe(ids[1]);
      expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-current", "step");
    });

    it("corrects the message on load against the stored query", async () => {
      const shared = showView(new SharedState({ query: "n:>1", messageId: ids[0] }));
      await screen.findByText("1 / 2");
      expect(shared.messageId).toBe(ids[1]);
    });

    it("doesn't correct the stored message against a draft on load", async () => {
      const shared = new SharedState({ messageId: ids[0] });
      shared.setQueryDraft("n:>1");
      showView(shared);
      await screen.findByText("1 / 2");
      expect(shared.messageId).toBe(ids[0]);
    });

    it("shows a stored query's error, and every message, when it can't be read", async () => {
      const shared = showView(new SharedState({ query: "bogus:1", messageId: ids[1] }));
      await screen.findByText("2 / 3");
      expect(filterBox()).toHaveAccessibleDescription("Unknown field: bogus");
      // Every message is in the list, so the stored one is kept.
      expect(shared.messageId).toBe(ids[1]);
    });

    it("keeps a half-typed query when the view goes away and comes back", async () => {
      const shared = new SharedState({});
      const { unmount } = render(
        <ViewStateProvider viewId="looking-inside" view={new LookingInsideState({})} shared={shared}>
          <LookingInside />
        </ViewStateProvider>,
      );
      await screen.findByText("1 / 3");
      typeQuery("(n:2");
      unmount();
      showView(shared);
      await screen.findByText("1 / 3");
      expect(filterBox()).toHaveValue("(n:2");
      expect(filterBox()).toHaveAccessibleDescription("Incomplete query");
    });

    it("stops a run playing on a message the draft hides, keeping the marker before", async () => {
      const state = new LookingInsideState({});
      showView(new SharedState({}), state);
      await screen.findByText("1 / 3");
      jest.useFakeTimers();
      try {
        fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
        act(() => jest.advanceTimersByTime(500));
        typeQuery("n:>1");
        expect(jest.getTimerCount()).toBe(0);
        act(() => jest.advanceTimersByTime(5000));
        expect(state.markerByMessage).toEqual({ [ids[0]]: 1 });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
