import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { spokenText } from "../../core/conversation-card/__fixtures__/spoken-text";
import * as conversationCard from "../../core/conversation-card/conversation-card";
import { fetchIndex } from "../../core/data-loader";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { SharedState } from "../../core/state/shared-state";
import { TraceACaseState } from "./trace-a-case-state";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { AttributeDefinition } from "../../core/types/attributes";
import { S3Index, S3Item } from "../../core/types/s3-data";
import { clearDatasetIndexCache } from "../../core/use-dataset-index";
import { TraceACase } from "./trace-a-case";

jest.mock("../../core/data-loader", () => ({ fetchIndex: jest.fn() }));
const mockedFetchIndex = fetchIndex as jest.MockedFunction<typeof fetchIndex>;

function item(id: string, text: string, classification: number, groupSize: number): S3Item {
  return {
    id, text, classification,
    sources: { alien3: [0] },
    target: classification,
    target_label: null,
    observation: `Notes on ${id}.`,
    attributes: { voices_raised: classification, group_size: groupSize, resource_stressed: 1 },
    pathway_scores: {},
    pathway_variance_fractions: {},
  };
}

const YES_NO = { 0: "no", 1: "yes" };
// One of each kind, and a hidden one, which gets no mark.
const attributes: AttributeDefinition[] = [
  { key: "voices_raised", label: "Voices raised", description: "", type: "binary", valueLabels: YES_NO },
  { key: "group_size", label: "Group size", description: "", type: "integer", min: 1, max: 6 },
  { key: "resource_stressed", label: "Resource stressed", description: "", type: "binary", hidden: true },
];

// The first and third are classified Wait, the second Approach.
const items = [0, 6, 1].map(i => fixture.conversations[i])
  .map((c, i) => item(c.id, c.text, c.classification, i + 2));
const ids = items.map(i => i.id);
const index: S3Index = { metadata: { fa_fits: {}, review_sets: {}, attributes }, items };

function viewWith(shared: SharedState, state = new TraceACaseState({})) {
  return (
    <ViewStateProvider viewId="trace-a-case" view={state} shared={shared}>
      <TraceACase />
    </ViewStateProvider>
  );
}

function showView(shared = new SharedState({}), state = new TraceACaseState({})) {
  render(viewWith(shared, state));
  return shared;
}

function setReducedMotion() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: true }),
  });
}

const filterBox = () => screen.getByRole("textbox", { name: "Filter" });
const typeQuery = (text: string) => fireEvent.change(filterBox(), { target: { value: text } });
const wordsOf = (i: number) => items[i].text.split(/\s+/).join(" ");
const card = () => screen.getByRole("region", { name: "Conversation" });

describe("TraceACase", () => {
  beforeEach(() => {
    clearDatasetIndexCache();
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockResolvedValue(index);
  });

  afterEach(() => {
    delete (window as any).matchMedia;
  });

  it("shows loading, then the first conversation and the network", async () => {
    showView();
    expect(screen.getByRole("heading", { name: "Trace a Case" })).toBeInTheDocument();
    expect(screen.getByText("Loading conversations…")).toBeInTheDocument();
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(card()).toHaveTextContent(wordsOf(0));
    expect(screen.getByRole("heading", { name: "The Network" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Network diagram" })).toBeInTheDocument();
  });

  it("sets the shared conversation once the conversations arrive", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("moves the shared conversation with next and previous", async () => {
    const shared = showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Conversation 2 of 3");
    expect(shared.conversationId).toBe(ids[1]);
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("shows the conversation's label, notes and marks, with no mark for a hidden attribute", async () => {
    showView();
    await screen.findByText("1 / 3");
    expect(within(card()).getByText("wait")).toHaveClass("actual-label__pill");
    expect(within(card()).getByText(`Notes on ${ids[0]}.`)).toBeInTheDocument();
    expect(within(card()).getAllByRole("listitem").map(spokenText)).toEqual(["Voices raised: no", "Group size: 2"]);
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(within(card()).getByText("approach")).toHaveClass("actual-label__pill");
    expect(within(card()).getByText(`Notes on ${ids[1]}.`)).toBeInTheDocument();
    expect(within(card()).getAllByRole("listitem").map(spokenText)).toEqual(["Voices raised: yes", "Group size: 3"]);
  });

  it("draws the network for the conversation shown", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    const stepToAnswer = () => fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Approach/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    stepToAnswer();
    expect(screen.getByRole("img", { name: /predicts Wait/ })).toBeInTheDocument();
  });

  it("names the network's section by its heading", async () => {
    showView();
    await screen.findByText("1 / 3");
    expect(screen.getByRole("region", { name: "The Network" })).toBeInTheDocument();
  });

  it("opens straight on the saved conversation when the conversations are already loaded", async () => {
    const shared = new SharedState({});
    const { unmount } = render(viewWith(shared));
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    unmount();
    showView(shared);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.queryByText("Loading conversations…")).not.toBeInTheDocument();
  });

  it("opens on the saved conversation", async () => {
    showView(new SharedState({ conversationId: ids[2] }));
    expect(await screen.findByText("3 / 3")).toBeInTheDocument();
  });

  it("falls back to the first conversation for an unknown id", async () => {
    const shared = showView(new SharedState({ conversationId: "000000000000" }));
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(shared.conversationId).toBe(ids[0]);
  });

  it("shows an error when the conversations can't load", async () => {
    mockedFetchIndex.mockReset();
    mockedFetchIndex.mockRejectedValue(new Error("offline"));
    showView();
    expect(await screen.findByRole("alert")).toHaveTextContent("The conversations could not be loaded: offline");
  });

  it("says the conversations couldn't be shown when correcting the conversation fails", async () => {
    const shared = new SharedState({});
    jest.spyOn(shared, "ensureValidConversation").mockImplementation(() => {
      throw new Error("bad list");
    });
    showView(shared);
    expect(await screen.findByRole("alert")).toHaveTextContent("The conversations could not be shown: bad list");
  });

  it("says so when there are no conversations, and leaves the saved conversation alone", async () => {
    mockedFetchIndex.mockResolvedValue({ ...index, items: [] });
    const shared = showView(new SharedState({ conversationId: ids[1] }));
    expect(await screen.findByText("No conversations.")).toBeInTheDocument();
    expect(shared.conversationId).toBe(ids[1]);
  });

  it("reveals the network's answer at Step 4", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 4" })).toHaveAttribute("aria-current", "step");
  });

  it("starts a conversation not stepped yet with nothing done", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Step 2" })).not.toHaveAttribute("aria-current");
  });

  it("brings a conversation's steps back when returning to it", async () => {
    setReducedMotion();
    showView();
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
    expect(screen.getByRole("button", { name: "Step 4" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("img", { name: "Network diagram. The network predicts Wait." })).toBeInTheDocument();
  });

  it("keeps the steps done for each conversation in the view's state", async () => {
    setReducedMotion();
    const state = new TraceACaseState({});
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
    fireEvent.click(screen.getByRole("button", { name: "Step 1" }));
    expect(state.stepsByConversation).toEqual({ [ids[0]]: 3, [ids[1]]: 1 });
  });

  it("drops a step that is playing when the conversation changes, keeping the step before", async () => {
    const state = new TraceACaseState({});
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      act(() => jest.advanceTimersByTime(500));
      fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(state.stepsByConversation).toEqual({ [ids[0]]: 1 });
      fireEvent.click(screen.getByRole("button", { name: "Previous conversation" }));
      expect(screen.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-current", "step");
    } finally {
      jest.useRealTimers();
    }
  });

  it("resets the conversation shown, and only that one", async () => {
    setReducedMotion();
    const state = new TraceACaseState({ stepsByConversation: { [ids[1]]: 2 } });
    showView(new SharedState({}), state);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    for (const step of [1, 2, 3, 4]) {
      expect(screen.getByRole("button", { name: `Step ${step}` })).not.toHaveAttribute("aria-current");
    }
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
    expect(state.stepsByConversation).toEqual({ [ids[1]]: 2 });
  });

  it("stops a step that is playing when the view unmounts, keeping the step before", async () => {
    const state = new TraceACaseState({});
    const { unmount } = render(viewWith(new SharedState({}), state));
    await screen.findByText("1 / 3");
    jest.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      act(() => jest.advanceTimersByTime(500));
      unmount();
      expect(jest.getTimerCount()).toBe(0);
      act(() => jest.advanceTimersByTime(5000));
      expect(state.stepsByConversation).toEqual({ [ids[0]]: 1 });
    } finally {
      jest.useRealTimers();
    }
  });

  it("doesn't re-render the conversation card while a step plays", async () => {
    showView();
    await screen.findByText("1 / 3");
    const cardRenders = jest.spyOn(conversationCard, "ConversationCard");
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

  it("opens a conversation at the steps saved for it", async () => {
    showView(new SharedState({}), new TraceACaseState({ stepsByConversation: { [ids[0]]: 2 } }));
    await screen.findByText("1 / 3");
    expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-current", "step");
  });

  describe("the filter", () => {
    it("shows the filter, counting every conversation", async () => {
      showView();
      await screen.findByText("1 / 3");
      expect(filterBox()).toHaveAccessibleDescription("3");
    });

    it("narrows the conversations as the student types, without storing the query", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      typeQuery("n:>1");
      expect(filterBox()).toHaveAccessibleDescription("2 of 3");
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      expect(card()).toHaveTextContent(wordsOf(1));
      expect(shared.query).toBeUndefined();
      expect(shared.conversationId).toBe(ids[0]);
    });

    it("stores the query and corrects the conversation on Enter", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      typeQuery("n:>1");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(shared.query).toBe("n:>1");
      expect(shared.conversationId).toBe(ids[1]);
    });

    it("steps through only the matches", async () => {
      const shared = showView(new SharedState({ query: "n:>1" }));
      await screen.findByText("1 / 2");
      fireEvent.click(screen.getByRole("button", { name: "Next conversation" }));
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
      expect(shared.conversationId).toBe(ids[2]);
      expect(screen.getByRole("button", { name: "Next conversation" })).toHaveAttribute("aria-disabled", "true");
    });

    it("shows the matching conversation's own words, not the one at its place in the list", async () => {
      showView(new SharedState({ query: "n:3" }));
      await screen.findByText("1 / 1");
      expect(card()).toHaveTextContent(wordsOf(2));
    });

    it("draws the network for the matching conversation, not the one at its place in the list", async () => {
      setReducedMotion();
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
      const next = screen.getByRole("button", { name: "Next conversation" });
      act(() => next.focus());
      fireEvent.click(next);
      expect(shared.query).toBe("n:>1");
      expect(shared.conversationId).toBe(ids[2]);
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });

    it("says so when nothing matches, leaving out the steps and the network", async () => {
      const shared = showView();
      await screen.findByText("1 / 3");
      typeQuery("n:9");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(filterBox()).toHaveAccessibleDescription("0 of 3");
      expect(screen.getByText("No conversations match the filter.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Step 1" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "The Network" })).not.toBeInTheDocument();
      expect(shared.conversationId).toBe(ids[0]);
    });

    it("brings the same conversation back, at its step, when the query is cleared", async () => {
      setReducedMotion();
      const shared = showView(new SharedState({ conversationId: ids[1] }));
      await screen.findByText("2 / 3");
      fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
      typeQuery("n:9");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      typeQuery("");
      fireEvent.keyDown(filterBox(), { key: "Enter" });
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
      expect(shared.conversationId).toBe(ids[1]);
      expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-current", "step");
    });

    it("corrects the conversation on load against the stored query", async () => {
      const shared = showView(new SharedState({ query: "n:>1", conversationId: ids[0] }));
      await screen.findByText("1 / 2");
      expect(shared.conversationId).toBe(ids[1]);
    });

    it("doesn't correct the stored conversation against a draft on load", async () => {
      const shared = new SharedState({ conversationId: ids[0] });
      shared.setQueryDraft("n:>1");
      showView(shared);
      await screen.findByText("1 / 2");
      expect(shared.conversationId).toBe(ids[0]);
    });

    it("shows a stored query's error, and every conversation, when it can't be read", async () => {
      const shared = showView(new SharedState({ query: "bogus:1", conversationId: ids[1] }));
      await screen.findByText("2 / 3");
      expect(filterBox()).toHaveAccessibleDescription("Unknown field: bogus");
      // Every conversation is in the list, so the stored one is kept.
      expect(shared.conversationId).toBe(ids[1]);
    });

    it("keeps a half-typed query when the view goes away and comes back", async () => {
      const shared = new SharedState({});
      const { unmount } = render(
        <ViewStateProvider viewId="trace-a-case" view={new TraceACaseState({})} shared={shared}>
          <TraceACase />
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

    it("stops a step playing on a conversation the draft hides, keeping the step before", async () => {
      const state = new TraceACaseState({});
      showView(new SharedState({}), state);
      await screen.findByText("1 / 3");
      jest.useFakeTimers();
      try {
        fireEvent.click(screen.getByRole("button", { name: "Step 2" }));
        act(() => jest.advanceTimersByTime(500));
        typeQuery("n:>1");
        expect(jest.getTimerCount()).toBe(0);
        act(() => jest.advanceTimersByTime(5000));
        expect(state.stepsByConversation).toEqual({ [ids[0]]: 1 });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
