import { fromSnapshot } from "mobx-keystone";
import { TraceACaseState } from "./trace-a-case-state";
import { savedJson } from "../../core/state/test-helpers";
import fixture from "./__fixtures__/trace-a-case-state.v1.json";

const empty = { version: 1, stepsByConversation: {}, $modelType: "npw/TraceACaseState" };

describe("TraceACaseState", () => {
  it("starts at version 1 with no steps done", () => {
    expect(savedJson(new TraceACaseState({}))).toEqual(empty);
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(TraceACaseState, fixture as any))).toEqual(fixture);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(TraceACaseState, { version: 1, stepsByConversation: {} } as any)))
      .toEqual(empty);
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(TraceACaseState, { ...fixture, version: 2 } as any)).toThrow();
  });

  it.each([5, -1, 1.5, "3"])("rejects a saved step count of %p", stepsDone => {
    const saved = { ...fixture, stepsByConversation: { "361e65b1002a": stepsDone } };
    expect(() => fromSnapshot(TraceACaseState, saved as any)).toThrow();
  });

  it("reads each conversation's steps, and none for a conversation not stepped yet", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    expect(state.stepsDone("361e65b1002a")).toBe(3);
    expect(state.stepsDone("7b117e548ba4")).toBe(1);
    expect(state.stepsDone("7ca6475a5371")).toBe(0);
  });

  it("sets one conversation's steps without touching the others", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    state.setStepsDone("7b117e548ba4", 4);
    expect(savedJson(state)).toEqual({
      ...fixture, stepsByConversation: { "361e65b1002a": 3, "7b117e548ba4": 4 },
    });
  });

  it("forgets a conversation set back to no steps, so the saved form stays small", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    state.setStepsDone("361e65b1002a", 0);
    expect(savedJson(state)).toEqual({ ...fixture, stepsByConversation: { "7b117e548ba4": 1 } });
  });

  it("refuses a step count past the last step", () => {
    const state = new TraceACaseState({});
    expect(() => state.setStepsDone("361e65b1002a", 5)).toThrow();
    expect(state.stepsDone("361e65b1002a")).toBe(0);
  });
});
