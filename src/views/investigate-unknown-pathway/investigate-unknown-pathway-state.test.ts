import { fromSnapshot } from "mobx-keystone";
import { savedJson } from "../../core/state/test-helpers";
import { InvestigateUnknownPathwayState } from "./investigate-unknown-pathway-state";
import unknownFixture from "./__fixtures__/investigate-unknown-pathway-state.v1.json";

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

  it("rejects a saved form with a wrong-typed field", () => {
    expect(() => fromSnapshot(InvestigateUnknownPathwayState, {
      ...unknownFixture, pane1: { selectedAttributes: "group_size" },
    } as any)).toThrow();
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
    const ids = ["3fa91c2e", "a07b5d10", "e41c9f22"];

    it("picks the second conversation when pane 1 is on the first", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.ensureValidPane2Conversation(ids, "3fa91c2e");
      expect(state.pane2.conversationId).toBe("a07b5d10");
    });

    it("picks a different conversation from pane 1's, wherever pane 1 is in the list", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.ensureValidPane2Conversation(ids, "a07b5d10");
      expect(state.pane2.conversationId).toBe("3fa91c2e");
    });

    it("avoids the conversation pane 1 will fall back to when pane 1's is unset or filtered out", () => {
      const unset = new InvestigateUnknownPathwayState({});
      unset.ensureValidPane2Conversation(ids, undefined);
      expect(unset.pane2.conversationId).toBe("a07b5d10");
      const filteredOut = new InvestigateUnknownPathwayState({});
      filteredOut.ensureValidPane2Conversation(ids, "00000000");
      expect(filteredOut.pane2.conversationId).toBe("a07b5d10");
    });

    it("picks the only conversation when the list has one, even if pane 1 shows it", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.ensureValidPane2Conversation(["3fa91c2e"], "3fa91c2e");
      expect(state.pane2.conversationId).toBe("3fa91c2e");
    });

    it("keeps a conversation the filter includes, even one the student also chose for pane 1", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.setPane2ConversationId("e41c9f22");
      state.ensureValidPane2Conversation(ids, "e41c9f22");
      expect(state.pane2.conversationId).toBe("e41c9f22");
    });

    it("keeps the conversation when the filter matches nothing", () => {
      const state = new InvestigateUnknownPathwayState({});
      state.setPane2ConversationId("e41c9f22");
      state.ensureValidPane2Conversation([], "3fa91c2e");
      expect(state.pane2.conversationId).toBe("e41c9f22");
    });
  });
});
