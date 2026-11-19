import { fromSnapshot } from "mobx-keystone";
import { TraceACaseState } from "./trace-a-case-state";
import { savedJson, speedNamed } from "../../core/state/test-helpers";
import { NORMAL_SPEED } from "../../core/state/animation";
import fixture from "./__fixtures__/trace-a-case-state.v1.json";

const empty = {
  version: 1, markerByMessage: {}, animate: true, speed: NORMAL_SPEED, $modelType: "npw/TraceACaseState",
};

describe("TraceACaseState", () => {
  it("starts at version 1 with no steps done", () => {
    expect(savedJson(new TraceACaseState({}))).toEqual(empty);
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(TraceACaseState, fixture as any))).toEqual(fixture);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(TraceACaseState, { version: 1, markerByMessage: {} } as any)))
      .toEqual(empty);
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(TraceACaseState, { ...fixture, version: 2 } as any)).toThrow();
  });

  it.each([5, -1, 1.5, "3"])("rejects a saved marker of %p", marker => {
    const saved = { ...fixture, markerByMessage: { "361e65b1002a": marker } };
    expect(() => fromSnapshot(TraceACaseState, saved as any)).toThrow();
  });

  it("reads each message's marker, and the start for a message not stepped yet", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    expect(state.marker("361e65b1002a")).toBe(3);
    expect(state.marker("7b117e548ba4")).toBe(1);
    expect(state.marker("7ca6475a5371")).toBe(0);
  });

  it("stores one message's marker without touching the others", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    state.setMarker("7b117e548ba4", 4);
    expect(savedJson(state)).toEqual({
      ...fixture, markerByMessage: { "361e65b1002a": 3, "7b117e548ba4": 4 },
    });
  });

  it("forgets a message back at the start, so the saved form stays small", () => {
    const state = fromSnapshot(TraceACaseState, fixture as any);
    state.setMarker("361e65b1002a", 0);
    expect(savedJson(state)).toEqual({ ...fixture, markerByMessage: { "7b117e548ba4": 1 } });
  });

  it("loads a saved form from before Animate and speed, with Animate on at normal speed", () => {
    const older = { version: 1, markerByMessage: fixture.markerByMessage };
    const state = fromSnapshot(TraceACaseState, older as any);
    expect(state.animate).toBe(true);
    expect(state.speed).toBe(NORMAL_SPEED);
    expect(state.marker("361e65b1002a")).toBe(3);
  });

  it("stores Animate and the speed", () => {
    const state = new TraceACaseState({});
    state.setAnimate(false);
    state.setSpeed(speedNamed("Slow"));
    expect(savedJson(state)).toEqual({ ...empty, animate: false, speed: speedNamed("Slow") });
  });

  it("rejects a saved speed that isn't one of the slider's stops", () => {
    expect(() => fromSnapshot(TraceACaseState, { ...fixture, speed: 3 } as any)).toThrow();
  });

  it("refuses a marker past the last step", () => {
    const state = new TraceACaseState({});
    expect(() => state.setMarker("361e65b1002a", 5)).toThrow();
    expect(state.marker("361e65b1002a")).toBe(0);
  });
});
