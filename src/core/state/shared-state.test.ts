import { fromSnapshot, getGlobalConfig, ModelAutoTypeCheckingMode } from "mobx-keystone";
import { SharedState } from "./shared-state";
import { savedJson } from "./test-helpers";
import fixture from "./__fixtures__/shared-state.v1.json";
import noConversationFixture from "./__fixtures__/shared-state.v1-no-conversation.json";

describe("SharedState", () => {
  it("turns on type checking in every environment when it is imported, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("starts at version 1 with no conversation", () => {
    expect(savedJson(new SharedState({}))).toEqual({ version: 1, $modelType: "npw/SharedState" });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(SharedState, fixture as any))).toEqual(fixture);
  });

  it("loads a version 1 form saved before conversationId existed", () => {
    const state = fromSnapshot(SharedState, noConversationFixture as any);
    expect(state.conversationId).toBeUndefined();
    expect(savedJson(state)).toEqual(noConversationFixture);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(SharedState, { version: 1 } as any))).toEqual(noConversationFixture);
  });

  it("rejects a saved form with a wrong-typed conversationId", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, conversationId: 42 } as any)).toThrow();
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, version: 2 } as any)).toThrow();
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
});
