import { fromSnapshot } from "mobx-keystone";
import { COMMISSION_BUDGET, SharedState } from "./shared-state";
import { savedJson } from "./test-helpers";
import fixture from "./__fixtures__/shared-state.v1.json";

describe("SharedState", () => {
  it("starts with no query, no conversation and nothing commissioned", () => {
    expect(savedJson(new SharedState({}))).toEqual({
      version: 1, commissioned: [], $modelType: "npw/SharedState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(SharedState, fixture as any))).toEqual(fixture);
  });

  it("loads a saved form without optional fields or $modelType", () => {
    const state = fromSnapshot(SharedState, { version: 1 } as any);
    expect(savedJson(state)).toEqual({ version: 1, commissioned: [], $modelType: "npw/SharedState" });
  });

  it("rejects a saved form with a wrong-typed field", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, commissioned: "young_present" } as any)).toThrow();
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, version: 2 } as any)).toThrow();
  });

  it("keeps a cleared query distinct from no query", () => {
    const state = new SharedState({});
    state.setQuery("");
    expect(state.query).toBe("");
    expect(savedJson(state)).toEqual(expect.objectContaining({ query: "" }));
    state.setQuery(undefined);
    expect(state.query).toBeUndefined();
  });

  it("sets the conversation", () => {
    const state = new SharedState({});
    state.setConversationId("a07b5d10");
    expect(state.conversationId).toBe("a07b5d10");
  });

  describe("ensureValidConversation", () => {
    const ids = ["3fa91c2e", "a07b5d10"];

    it("picks the first conversation when none is set", () => {
      const state = new SharedState({});
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("3fa91c2e");
    });

    it("replaces a conversation the filter no longer includes", () => {
      const state = new SharedState({ conversationId: "e41c9f22" });
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("3fa91c2e");
    });

    it("keeps a conversation the filter includes", () => {
      const state = new SharedState({ conversationId: "a07b5d10" });
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("a07b5d10");
    });

    it("keeps the conversation when the filter matches nothing", () => {
      const state = new SharedState({ conversationId: "e41c9f22" });
      state.ensureValidConversation([]);
      expect(state.conversationId).toBe("e41c9f22");
    });
  });

  describe("commissioning", () => {
    it("allows two codings, in the order they were commissioned", () => {
      expect(COMMISSION_BUDGET).toBe(2);
      const state = new SharedState({});
      state.commission("young_present");
      state.commission("gestures_repeated");
      expect(state.commissioned).toEqual(["young_present", "gestures_repeated"]);
    });

    it("ignores a coding that is already commissioned", () => {
      const state = new SharedState({});
      state.commission("young_present");
      state.commission("young_present");
      expect(state.commissioned).toEqual(["young_present"]);
    });

    it("ignores codings past the budget", () => {
      const state = new SharedState({});
      state.commission("young_present");
      state.commission("gestures_repeated");
      state.commission("carrying_burden");
      expect(state.commissioned).toEqual(["young_present", "gestures_repeated"]);
    });

    it("reset empties the list and frees the budget", () => {
      const state = new SharedState({});
      state.commission("young_present");
      state.commission("gestures_repeated");
      state.resetCommissioned();
      expect(state.commissioned).toEqual([]);
      state.commission("carrying_burden");
      expect(state.commissioned).toEqual(["carrying_burden"]);
    });
  });
});
