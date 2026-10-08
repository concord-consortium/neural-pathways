import { fromSnapshot } from "mobx-keystone";
import { savedJson } from "../../core/state/test-helpers";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { SPEED } from "../../core/state/animation";
import fixture from "./__fixtures__/extract-pathways-state.v1.json";

const empty = {
  version: 1, setupDone: false, collected: 0, animate: true, speed: SPEED.normal,
  $modelType: "npw/ExtractPathwaysState",
};

describe("ExtractPathwaysState", () => {
  it("starts at version 1 with nothing done", () => {
    expect(savedJson(new ExtractPathwaysState({}))).toEqual(empty);
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(ExtractPathwaysState, fixture as any))).toEqual(fixture);
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...fixture, version: 2 } as any)).toThrow();
  });

  it.each([-1, 1.5, "3"])("rejects a saved count of %p", collected => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...fixture, collected } as any)).toThrow();
  });

  it("sets Setup and the count together", () => {
    const state = new ExtractPathwaysState({});
    state.setProgress(true, 2);
    expect(savedJson(state)).toEqual({ ...empty, setupDone: true, collected: 2 });
  });

  it("loads a saved form from before Animate and speed, with Animate on at normal speed", () => {
    const older = { version: 1, setupDone: true, collected: 3 };
    const state = fromSnapshot(ExtractPathwaysState, older as any);
    expect(state.animate).toBe(true);
    expect(state.speed).toBe(SPEED.normal);
    expect(state.collected).toBe(3);
  });

  it("stores Animate and the speed", () => {
    const state = new ExtractPathwaysState({});
    state.setAnimate(false);
    state.setSpeed(SPEED.fast);
    expect(savedJson(state)).toEqual({ ...empty, animate: false, speed: SPEED.fast });
  });

  it("refuses a negative count and leaves Setup as it was", () => {
    const state = new ExtractPathwaysState({});
    expect(() => state.setProgress(true, -1)).toThrow();
    expect(savedJson(state)).toEqual(empty);
  });
});
