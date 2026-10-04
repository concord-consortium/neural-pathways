import {
  fromSnapshot, getGlobalConfig, getSnapshot, Model, model, ModelAutoTypeCheckingMode, SnapshotTypeMismatchError,
} from "mobx-keystone";
import { COMMISSION_BUDGET, SharedState } from "./shared-state";
import { savedJson } from "./test-helpers";
import fixture from "./__fixtures__/shared-state.v1.json";
import noConversationFixture from "./__fixtures__/shared-state.v1-no-conversation.json";

const empty = { version: 1, commissioned: [], $modelType: "npw/SharedState" };

// Test-only: another registered model whose saved form must not load as SharedState.
@model("test/NotSharedState")
class NotSharedState extends Model({}) {}

describe("SharedState", () => {
  it("turns on type checking in every environment when it is imported, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("starts with no query, no conversation and nothing commissioned", () => {
    expect(savedJson(new SharedState({}))).toEqual(empty);
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(SharedState, fixture as any))).toEqual(fixture);
  });

  it("loads a version 1 form saved before its fields existed, giving them their defaults", () => {
    const state = fromSnapshot(SharedState, noConversationFixture as any);
    expect(state.query).toBeUndefined();
    expect(state.conversationId).toBeUndefined();
    expect(savedJson(state)).toEqual(empty);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(SharedState, { version: 1 } as any))).toEqual(empty);
  });

  it("rejects a saved form with a wrong-typed conversationId", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, conversationId: 42 } as any)).toThrow();
  });

  it("rejects a saved form with a wrong-typed commissioned list", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, commissioned: "young_present" } as any)).toThrow();
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, version: 2 } as any)).toThrow();
  });

  // Before mobx-keystone 2.3.0 this returned a NotSharedState (mobx-keystone #590).
  it("rejects the saved form of a different model", () => {
    const other = getSnapshot(new NotSharedState({}));
    expect(() => fromSnapshot(SharedState, other as any)).toThrow(SnapshotTypeMismatchError);
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
    state.setConversationId("7b117e548ba4");
    expect(state.conversationId).toBe("7b117e548ba4");
  });

  describe("ensureValidConversation", () => {
    const ids = ["361e65b1002a", "7b117e548ba4"];

    it("picks the first conversation when none is set", () => {
      const state = new SharedState({});
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("361e65b1002a");
    });

    it("replaces a conversation the list no longer includes", () => {
      const state = new SharedState({ conversationId: "7ca6475a5371" });
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("361e65b1002a");
    });

    it("keeps a conversation the list includes", () => {
      const state = new SharedState({ conversationId: "7b117e548ba4" });
      state.ensureValidConversation(ids);
      expect(state.conversationId).toBe("7b117e548ba4");
    });

    it("keeps the conversation when the list is empty", () => {
      const state = new SharedState({ conversationId: "7ca6475a5371" });
      state.ensureValidConversation([]);
      expect(state.conversationId).toBe("7ca6475a5371");
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
