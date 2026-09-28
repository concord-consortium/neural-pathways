import { fromSnapshot } from "mobx-keystone";
import { InvestigatePathwaysState } from "./investigate-pathways-state";
import { CorrelationsState } from "./correlations-state";
import { InvestigateUnknownPathwayState } from "./investigate-unknown-pathway-state";
import { savedJson } from "./test-helpers";
import investigateFixture from "./__fixtures__/investigate-pathways-state.v1.json";
import correlationsFixture from "./__fixtures__/correlations-state.v1.json";
import unknownFixture from "./__fixtures__/investigate-unknown-pathway-state.v1.json";

describe("InvestigatePathwaysState", () => {
  it("starts with nothing selected", () => {
    expect(savedJson(new InvestigatePathwaysState({}))).toEqual({
      version: 1, $modelType: "npw/InvestigatePathwaysState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(InvestigatePathwaysState, investigateFixture as any))).toEqual(investigateFixture);
  });

  it("rejects a selection of an unknown kind", () => {
    expect(() => fromSnapshot(InvestigatePathwaysState, {
      ...investigateFixture, loadingSelection: { kind: "layer", index: 1 },
    } as any)).toThrow();
  });

  it("selects a pathway or a neuron, and clears the selection", () => {
    const state = new InvestigatePathwaysState({});
    state.setLoadingSelection({ kind: "pathway", index: 2 });
    expect(state.loadingSelection).toEqual({ kind: "pathway", index: 2 });
    state.setLoadingSelection(undefined);
    expect(state.loadingSelection).toBeUndefined();
  });
});

describe("CorrelationsState", () => {
  it("starts on Measures with no detail card open", () => {
    expect(savedJson(new CorrelationsState({}))).toEqual({
      version: 1, mode: "measures", $modelType: "npw/CorrelationsState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(CorrelationsState, correlationsFixture as any))).toEqual(correlationsFixture);
  });

  it("rejects an unknown mode", () => {
    expect(() => fromSnapshot(CorrelationsState, { ...correlationsFixture, mode: "table" } as any)).toThrow();
  });

  it("switches mode", () => {
    const state = new CorrelationsState({});
    state.setMode("graphs");
    expect(state.mode).toBe("graphs");
  });

  it("opens a cell or pathway detail card by attribute key and pathway number, and closes it", () => {
    const state = new CorrelationsState({});
    state.openDetailCard({ kind: "cell", attribute: "young_present", pathway: 1 });
    expect(state.openDetail).toEqual({ kind: "cell", attribute: "young_present", pathway: 1 });
    state.openDetailCard({ kind: "pathway", pathway: 3 });
    expect(state.openDetail).toEqual({ kind: "pathway", pathway: 3 });
    state.closeDetailCard();
    expect(state.openDetail).toBeUndefined();
  });
});

describe("InvestigateUnknownPathwayState", () => {
  it("starts with nothing selected in either pane", () => {
    expect(savedJson(new InvestigateUnknownPathwayState({}))).toEqual({
      version: 1,
      pane1: { selectedAttributes: [] },
      pane2: { selectedAttributes: [] },
      $modelType: "npw/InvestigateUnknownPathwayState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(InvestigateUnknownPathwayState, unknownFixture as any))).toEqual(unknownFixture);
  });

  it("loads a saved form without pane 2's conversation", () => {
    const state = fromSnapshot(InvestigateUnknownPathwayState, {
      version: 1, pane1: { selectedAttributes: [] }, pane2: { selectedAttributes: ["near_water"] },
      $modelType: "npw/InvestigateUnknownPathwayState",
    } as any);
    expect(state.pane2.conversationId).toBeUndefined();
    expect(state.pane2.selectedAttributes).toEqual(["near_water"]);
  });

  it("toggles attribute chips on each pane separately", () => {
    const state = new InvestigateUnknownPathwayState({});
    state.toggleAttribute(1, "group_size");
    state.toggleAttribute(2, "near_water");
    state.toggleAttribute(1, "young_present");
    state.toggleAttribute(1, "group_size");
    expect(state.pane1.selectedAttributes).toEqual(["young_present"]);
    expect(state.pane2.selectedAttributes).toEqual(["near_water"]);
  });

  it("sets pane 2's conversation", () => {
    const state = new InvestigateUnknownPathwayState({});
    state.setPane2ConversationId("a07b5d10");
    expect(state.pane2.conversationId).toBe("a07b5d10");
  });

  describe("ensureValidPane2Conversation", () => {
    it("picks the second conversation, so the panes start on different cases", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.ensureValidPane2Conversation(["3fa91c2e", "a07b5d10", "e41c9f22"]);
      expect(state.pane2.conversationId).toBe("a07b5d10");
    });

    it("picks the only conversation when the list has one", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.ensureValidPane2Conversation(["3fa91c2e"]);
      expect(state.pane2.conversationId).toBe("3fa91c2e");
    });

    it("keeps a conversation the filter includes", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.setPane2ConversationId("e41c9f22");
      state.ensureValidPane2Conversation(["3fa91c2e", "a07b5d10", "e41c9f22"]);
      expect(state.pane2.conversationId).toBe("e41c9f22");
    });

    it("keeps the conversation when the filter matches nothing", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.setPane2ConversationId("e41c9f22");
      state.ensureValidPane2Conversation([]);
      expect(state.pane2.conversationId).toBe("e41c9f22");
    });
  });
});
