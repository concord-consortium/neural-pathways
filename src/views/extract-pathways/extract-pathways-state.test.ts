import { fromSnapshot } from "mobx-keystone";
import { savedJson, speedNamed } from "../../core/state/test-helpers";
import { ExtractPathwaysState } from "./extract-pathways-state";
import { NORMAL_SPEED } from "../../core/state/animation";
import fixture from "./__fixtures__/extract-pathways-state.v1.json";
import pathwaysDone from "./__fixtures__/extract-pathways-state.v1-pathways-done.json";

const empty = {
  version: 1, setupDone: false, collected: 0, deckDone: false, pathwaysDone: false, animate: true,
  speed: NORMAL_SPEED, $modelType: "npw/ExtractPathwaysState",
};

describe("ExtractPathwaysState", () => {
  it("starts at version 1 with nothing done", () => {
    expect(savedJson(new ExtractPathwaysState({}))).toEqual(empty);
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(ExtractPathwaysState, fixture as any))).toEqual(fixture);
  });

  it("loads its saved form with the deck and the pathways done, and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(ExtractPathwaysState, pathwaysDone as any))).toEqual(pathwaysDone);
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...fixture, version: 2 } as any)).toThrow();
  });

  it.each([-1, 1.5, "3"])("rejects a saved count of %p", collected => {
    expect(() => fromSnapshot(ExtractPathwaysState, { ...fixture, collected } as any)).toThrow();
  });

  it("sets all four stages together", () => {
    const state = new ExtractPathwaysState({});
    state.setProgress({ setupDone: true, collected: 800, deckDone: true, pathwaysDone: false });
    expect(savedJson(state)).toEqual({ ...empty, setupDone: true, collected: 800, deckDone: true });
  });

  it("loads a saved form from before Animate and speed, with Animate on at normal speed", () => {
    const older = { version: 1, setupDone: true, collected: 3 };
    const state = fromSnapshot(ExtractPathwaysState, older as any);
    expect(state.animate).toBe(true);
    expect(state.speed).toBe(NORMAL_SPEED);
    expect(state.collected).toBe(3);
  });

  it("loads a saved form from before the deck and the pathways, with neither done", () => {
    const older = { version: 1, setupDone: true, collected: 3, animate: true, speed: NORMAL_SPEED };
    const state = fromSnapshot(ExtractPathwaysState, older as any);
    expect(state.deckDone).toBe(false);
    expect(state.pathwaysDone).toBe(false);
    expect(state.collected).toBe(3);
  });

  it("stores Animate and the speed", () => {
    const state = new ExtractPathwaysState({});
    state.setAnimate(false);
    state.setSpeed(speedNamed("Fast"));
    expect(savedJson(state)).toEqual({ ...empty, animate: false, speed: speedNamed("Fast") });
  });

  it("refuses a negative count and leaves every stage as it was", () => {
    const state = new ExtractPathwaysState({});
    expect(() => state.setProgress({ setupDone: true, collected: -1, deckDone: true, pathwaysDone: true }))
      .toThrow();
    expect(savedJson(state)).toEqual(empty);
  });
});
