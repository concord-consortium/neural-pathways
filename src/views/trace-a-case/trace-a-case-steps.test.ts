import { emptyScene, Scene } from "../../core/network-diagram/scene";
import { sceneAt } from "../../core/network-diagram/forward-pass-phases";
import { StepPlayer } from "../../core/steps/step-player";
import { clearReducedMotion, setReducedMotion } from "../../core/steps/test-helpers";
import { TRACE_BUTTONS, traceProgress, traceTimeline } from "./trace-a-case-steps";
import { TraceACaseState } from "./trace-a-case-state";

const SIZES = [10, 8, 6, 2];
const timeline = traceTimeline(SIZES);

/** Players over one TraceACaseState, made for a conversation as the view makes them. */
function makeState() {
  const state = new TraceACaseState({});
  const playerFor = (conversationId: string) => new StepPlayer(timeline, traceProgress(state, conversationId));
  /** The markers stored, by conversation. */
  const stored = () => ({ ...state.markerByConversation });
  return { playerFor, stored };
}

/** Presses Step `step` as the step row does. */
function press(player: StepPlayer<Scene>, step: number) {
  const button = TRACE_BUTTONS[step - 1];
  player.play(button.key, button.segmentToPlayWhenAt(player.marker)!);
}

describe("TRACE_BUTTONS", () => {
  it("are Step 1 to Step 4, each playing from the marker before it", () => {
    expect(TRACE_BUTTONS.map(b => b.label)).toEqual(["Step 1", "Step 2", "Step 3", "Step 4"]);
    for (const marker of [0, 2, 4]) {
      expect(TRACE_BUTTONS.map(b => b.segmentToPlayWhenAt(marker))).toEqual([
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      ]);
    }
  });

  it("mark the step for the marker the timeline rests at as current", () => {
    expect(TRACE_BUTTONS.map(b => b.showAsCurrentWhenAt?.(3))).toEqual([false, false, true, false]);
    expect(TRACE_BUTTONS.map(b => b.showAsCurrentWhenAt?.(0))).toEqual([false, false, false, false]);
  });
});

describe("traceTimeline", () => {
  it("times a segment of one phase, and refuses any other, since it draws only the phase it ends on", () => {
    expect(timeline.duration({ from: 1, to: 2 })).toBeGreaterThan(0);
    expect(() => timeline.duration({ from: 0, to: 2 })).toThrow(RangeError);
    expect(() => timeline.duration({ from: 2, to: 2 })).toThrow(RangeError);
  });
});

describe("Trace a Case's steps on the step player", () => {
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
    expect(player.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps to the marker before the step, then plays its run", () => {
    const player = makeState().playerFor("a");
    press(player, 2);
    expect(player.marker).toBe(1);
    expect(player.scene.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(player.scene.edgeDraw[0].every(x => x === 0)).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(player.scene.edgeDraw[0][0]).toBe(1);
    expect(player.scene.edgeDraw[0][9]).toBe(0);

    jest.advanceTimersByTime(3000);
    expect(player.marker).toBe(2);
    expect(player.scene).toEqual(sceneAt(SIZES, 2));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stores each conversation's marker by its id, so another starts with nothing done", () => {
    setReducedMotion(true);
    const { playerFor, stored } = makeState();
    press(playerFor("a"), 4);
    expect(stored()).toEqual({ a: 4 });
    const other = playerFor("b");
    expect(other.marker).toBe(0);
    expect(other.scene).toEqual(emptyScene(SIZES));
  });

  it("a new player for a conversation shows the marker stored for it", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    press(playerFor("a"), 4);
    const again = playerFor("a");
    expect(again.marker).toBe(4);
    expect(again.scene).toEqual(sceneAt(SIZES, 4));
  });
});
