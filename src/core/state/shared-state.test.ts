import {
  fromSnapshot, getGlobalConfig, getSnapshot, Model, model, ModelAutoTypeCheckingMode, onPatches, Patch,
  SnapshotTypeMismatchError, undoMiddleware,
} from "mobx-keystone";
import { SharedState } from "./shared-state";
import { savedJson } from "./test-helpers";
import fixture from "./__fixtures__/shared-state.v1.json";
import noMessageFixture from "./__fixtures__/shared-state.v1-no-message.json";

// Test-only: another registered model whose saved form must not load as SharedState.
@model("test/NotSharedState")
class NotSharedState extends Model({}) {}

describe("SharedState", () => {
  it("turns on type checking in every environment when it is imported, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("starts at version 1 with no message", () => {
    expect(savedJson(new SharedState({}))).toEqual({ version: 1, $modelType: "npw/SharedState" });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(SharedState, fixture as any))).toEqual(fixture);
  });

  it("loads a version 1 form saved before messageId and query existed", () => {
    const state = fromSnapshot(SharedState, noMessageFixture as any);
    expect(state.messageId).toBeUndefined();
    expect(state.query).toBeUndefined();
    expect(savedJson(state)).toEqual(noMessageFixture);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(SharedState, { version: 1 } as any))).toEqual(noMessageFixture);
  });

  it("rejects a saved form with a wrong-typed messageId", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, messageId: 42 } as any)).toThrow();
  });

  it("rejects a saved form with a wrong-typed query", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, query: 3 } as any)).toThrow();
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, version: 2 } as any)).toThrow();
  });

  // Before mobx-keystone 2.3.0 this returned a NotSharedState (mobx-keystone #590).
  it("rejects the saved form of a different model", () => {
    const other = getSnapshot(new NotSharedState({}));
    expect(() => fromSnapshot(SharedState, other as any)).toThrow(SnapshotTypeMismatchError);
  });

  it("sets the message", () => {
    const state = new SharedState({});
    state.setMessageId("7b117e548ba4");
    expect(state.messageId).toBe("7b117e548ba4");
  });

  describe("ensureValidMessage", () => {
    const ids = ["361e65b1002a", "7b117e548ba4"];

    it("picks the first message when none is set", () => {
      const state = new SharedState({});
      state.ensureValidMessage(ids);
      expect(state.messageId).toBe("361e65b1002a");
    });

    it("replaces a message the list no longer includes", () => {
      const state = new SharedState({ messageId: "7ca6475a5371" });
      state.ensureValidMessage(ids);
      expect(state.messageId).toBe("361e65b1002a");
    });

    it("keeps a message the list includes", () => {
      const state = new SharedState({ messageId: "7b117e548ba4" });
      state.ensureValidMessage(ids);
      expect(state.messageId).toBe("7b117e548ba4");
    });

    it("records a change only when the message needs correcting, so a valid one leaves nothing to undo", () => {
      const state = new SharedState({ messageId: "7b117e548ba4" });
      const patches: Patch[] = [];
      onPatches(state, recorded => patches.push(...recorded));
      state.ensureValidMessage(ids);
      expect(patches).toEqual([]);
      state.ensureValidMessage(["361e65b1002a"]);
      expect(patches).toEqual([{ op: "replace", path: ["messageId"], value: "361e65b1002a" }]);
    });

    it("keeps the message when the list is empty", () => {
      const state = new SharedState({ messageId: "7ca6475a5371" });
      state.ensureValidMessage([]);
      expect(state.messageId).toBe("7ca6475a5371");
    });
  });

  describe("the query", () => {
    const ids = ["361e65b1002a", "7b117e548ba4"];

    it("keeps the text being typed as a draft, without storing it", () => {
      const state = new SharedState({ query: "n:1" });
      state.setQueryDraft("n:2");
      expect(state.queryDraft).toBe("n:2");
      expect(state.query).toBe("n:1");
    });

    it("drops the draft when the text is typed back to the stored query", () => {
      const state = new SharedState({ query: "n:1" });
      state.setQueryDraft("n:12");
      state.setQueryDraft("n:1");
      expect(state.queryDraft).toBeUndefined();
    });

    it("drops the draft when the box is emptied and no query is stored", () => {
      const state = new SharedState({});
      state.setQueryDraft("n");
      state.setQueryDraft("");
      expect(state.queryDraft).toBeUndefined();
    });

    it("keeps an empty draft when a query is stored, so clearing it can be committed", () => {
      const state = new SharedState({ query: "n:1" });
      state.setQueryDraft("");
      expect(state.queryDraft).toBe("");
    });

    it("discards the draft", () => {
      const state = new SharedState({});
      state.setQueryDraft("(n:2");
      state.discardQueryDraft();
      expect(state.queryDraft).toBeUndefined();
    });

    it("stores a query, drops the draft and corrects the message", () => {
      const state = new SharedState({ messageId: "7ca6475a5371" });
      state.setQueryDraft("n:>0");
      state.setQueryAndCorrect("n:>0", ids);
      expect(state.query).toBe("n:>0");
      expect(state.queryDraft).toBeUndefined();
      expect(state.messageId).toBe("361e65b1002a");
    });

    it("keeps a message the query's matches include", () => {
      const state = new SharedState({ messageId: "7b117e548ba4" });
      state.setQueryAndCorrect("n:>0", ids);
      expect(state.messageId).toBe("7b117e548ba4");
    });

    it("never saves the draft", () => {
      const state = new SharedState({ query: "n:1" });
      state.setQueryDraft("(n:2");
      expect(savedJson(state)).toEqual({ version: 1, query: "n:1", $modelType: "npw/SharedState" });
    });

    // Undo isn't built. These pin the keystone behavior docs/undo.md relies on: the draft is never
    // an undo step, and a committed query with its correction is one.
    it("records no undo step for the draft, and one for a committed query with its correction", () => {
      const state = new SharedState({ messageId: "7ca6475a5371" });
      const undo = undoMiddleware(state);
      state.setQueryDraft("n:>0");
      expect(undo.undoLevels).toBe(0);
      state.setQueryAndCorrect("n:>0", ids);
      expect(undo.undoLevels).toBe(1);
      undo.undo();
      expect(state.query).toBeUndefined();
      expect(state.messageId).toBe("7ca6475a5371");
      undo.dispose();
    });
  });
});
