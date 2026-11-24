import { emptyScene } from "../../core/network-diagram/scene";
import { phaseDuration, sceneAt } from "../../core/network-diagram/forward-pass-phases";
import { StepPlayer } from "../../core/steps/step-player";
import { clearReducedMotion, setReducedMotion } from "../../core/steps/test-helpers";
import {
  LookingInsideScene, LOOKING_INSIDE_BUTTONS, lookingInsideProgress, lookingInsideTimeline,
} from "./looking-inside-steps";
import { LookingInsideState } from "./looking-inside-state";
import { inputFillAt, step1Duration } from "./word-flights";

const SIZES = [10, 8, 6, 2];
const timeline = lookingInsideTimeline(SIZES, 4);

/** Players over one LookingInsideState, made for a message as the view makes them. */
function makeState() {
  const state = new LookingInsideState({});
  const playerFor = (messageId: string) =>
    new StepPlayer(timeline, lookingInsideProgress(state, messageId), state);
  /** The markers stored, by message. */
  const stored = () => ({ ...state.markerByMessage });
  return { playerFor, stored };
}

/** Presses Step `step` as the step buttons do. */
function press(player: StepPlayer<LookingInsideScene>, step: number) {
  const button = LOOKING_INSIDE_BUTTONS[step - 1];
  player.play(button.key, button.segmentToPlayWhenAt(player.marker)!);
}

describe("LOOKING_INSIDE_BUTTONS", () => {
  it("are Step 1 to Step 4, each playing from the marker before it", () => {
    expect(LOOKING_INSIDE_BUTTONS.map(b => b.label)).toEqual(["Step 1", "Step 2", "Step 3", "Step 4"]);
    for (const marker of [0, 2, 4]) {
      expect(LOOKING_INSIDE_BUTTONS.map(b => b.segmentToPlayWhenAt(marker))).toEqual([
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      ]);
    }
  });

  it("mark the step for the marker the timeline rests at as current", () => {
    expect(LOOKING_INSIDE_BUTTONS.map(b => b.showAsCurrentWhenAt?.(3))).toEqual([false, false, true, false]);
    expect(LOOKING_INSIDE_BUTTONS.map(b => b.showAsCurrentWhenAt?.(0))).toEqual([false, false, false, false]);
  });
});

describe("lookingInsideTimeline", () => {
  it("times a segment of one phase, and refuses any other, since it draws only the phase it ends on", () => {
    expect(timeline.duration({ from: 1, to: 2 })).toBeGreaterThan(0);
    expect(() => timeline.duration({ from: 0, to: 2 })).toThrow(RangeError);
    expect(() => timeline.duration({ from: 2, to: 2 })).toThrow(RangeError);
  });

  it("plays Step 1 as the word flights, with the time into it on the scene", () => {
    expect(timeline.duration({ from: 0, to: 1 })).toBeCloseTo(step1Duration(10), 6);
    const scene = timeline.sceneAt(0, { button: "step-1", from: 0, to: 1, t: 1500 });
    expect(scene.step1Time).toBe(1500);
    expect(scene.network.nodeFill[0]).toEqual(inputFillAt(1500, 10, 4));
  });

  it("has no flight time at rest or in Steps 2–4", () => {
    expect(timeline.sceneAt(1).step1Time).toBeUndefined();
    expect(timeline.sceneAt(1, { button: "step-2", from: 1, to: 2, t: 100 }).step1Time).toBeUndefined();
  });

  it("plays Steps 2–4 as the shared phases", () => {
    expect(timeline.duration({ from: 2, to: 3 })).toBe(phaseDuration(3, SIZES));
  });
});

describe("Looking Inside a Neural Network's steps on the step player", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    clearReducedMotion();
  });

  it("starts with nothing done", () => {
    const player = makeState().playerFor("a");
    expect(player.marker).toBe(0);
    expect(player.scene.network).toEqual(emptyScene(SIZES));
  });

  it("jumps to the marker before the step, then plays its run", () => {
    const player = makeState().playerFor("a");
    press(player, 2);
    expect(player.marker).toBe(1);
    expect(player.scene.network.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(player.scene.network.edgeDraw[0].every(x => x === 0)).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(player.scene.network.edgeDraw[0][0]).toBe(1);
    expect(player.scene.network.edgeDraw[0][9]).toBe(0);

    jest.advanceTimersByTime(3000);
    expect(player.marker).toBe(2);
    expect(player.scene.network).toEqual(sceneAt(SIZES, 2));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stores each message's marker by its id, so another starts with nothing done", () => {
    setReducedMotion(true);
    const { playerFor, stored } = makeState();
    press(playerFor("a"), 4);
    expect(stored()).toEqual({ a: 4 });
    const other = playerFor("b");
    expect(other.marker).toBe(0);
    expect(other.scene.network).toEqual(emptyScene(SIZES));
  });

  it("a new player for a message shows the marker stored for it", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    press(playerFor("a"), 4);
    const again = playerFor("a");
    expect(again.marker).toBe(4);
    expect(again.scene.network).toEqual(sceneAt(SIZES, 4));
  });
});
