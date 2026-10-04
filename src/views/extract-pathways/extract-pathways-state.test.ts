import { fromSnapshot } from "mobx-keystone";
import { Animated, SPEED } from "../../core/state/animation";
import { savedJson } from "../../core/state/test-helpers";
import { ExtractPathwaysState } from "./extract-pathways-state";
import extractFixture from "./__fixtures__/extract-pathways-state.v1.json";

describe("ExtractPathwaysState", () => {
  it("starts unextracted, animation on, at normal speed", () => {
    expect(savedJson(new ExtractPathwaysState({}))).toEqual({
      version: 1, animate: true, speed: 1, extracted: false, collected: 0, cubeDone: false,
      pathwaysDone: false, $modelType: "npw/ExtractPathwaysState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(ExtractPathwaysState, extractFixture as any))).toEqual(extractFixture);
  });

  it("records each completed stage", () => {
    const state = new ExtractPathwaysState({});
    state.setExtracted(true);
    state.setCollected(10);
    state.setCubeDone(true);
    state.setPathwaysDone(true);
    state.setAnimate(false);
    state.setSpeed(2);
    expect(savedJson(state)).toEqual({
      version: 1, animate: false, speed: 2, extracted: true, collected: 10, cubeDone: true,
      pathwaysDone: true, $modelType: "npw/ExtractPathwaysState",
    });
  });

  it("rejects a saved form with a wrong-typed field", () => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...extractFixture, extracted: "yes" } as any)).toThrow();
  });

  it("rejects a negative collected count", () => {
    expect(() => new ExtractPathwaysState({}).setCollected(-1)).toThrow();
  });

  it("can be driven through the Animated interface", () => {
    const state: Animated = new ExtractPathwaysState({});
    state.setAnimate(false);
    state.setSpeed(SPEED.fast);
    expect(state.animate).toBe(false);
    expect(state.speed).toBe(SPEED.fast);
  });
});
