import { emptyScene, Scene } from "../../core/network-diagram/scene";
import { sceneAt } from "../../core/network-diagram/pass-steps";
import { StepPlayer } from "../../core/steps/step-player";
import { TRACE_BUTTONS, traceProgress, traceTimeline } from "./trace-a-case-steps";
import { TraceACaseState } from "./trace-a-case-state";

const SIZES = [10, 8, 6, 2];
const timeline = traceTimeline(SIZES);

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: reduce }),
  });
}

/** Players over one TraceACaseState, made for a conversation as the view makes them. */
function makeState() {
  const state = new TraceACaseState({});
  const playerFor = (conversationId: string) => new StepPlayer(timeline, traceProgress(state, conversationId));
  /** The markers saved, by conversation. */
  const saved = () => ({ ...state.markerByConversation });
  return { playerFor, saved };
}

/** Presses Step `step` as the step row does. */
function press(player: StepPlayer<Scene>, step: number) {
  const button = TRACE_BUTTONS[step - 1];
  player.play(button.key, button.segmentToPlayWhenAt(player.marker)!);
}

describe("TRACE_BUTTONS", () => {
  it("are Step 1 to Step 4, each playing from the step before it", () => {
    expect(TRACE_BUTTONS.map(b => b.label)).toEqual(["Step 1", "Step 2", "Step 3", "Step 4"]);
    for (const marker of [0, 2, 4]) {
      expect(TRACE_BUTTONS.map(b => b.segmentToPlayWhenAt(marker))).toEqual([
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      ]);
    }
  });

  it("show the step the timeline rests at as pressed", () => {
    expect(TRACE_BUTTONS.map(b => b.showAsPressedWhenAt?.(3))).toEqual([false, false, true, false]);
    expect(TRACE_BUTTONS.map(b => b.showAsPressedWhenAt?.(0))).toEqual([false, false, false, false]);
  });
});

describe("Trace a Case's steps on the step player", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).matchMedia;
  });

  it("starts with nothing done", () => {
    const player = makeState().playerFor("a");
    expect(player.marker).toBe(0);
    expect(player.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps to the step before, then plays the step", () => {
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

  it("saves the step before while a step plays, and the step only once it ends", () => {
    const { playerFor, saved } = makeState();
    const player = playerFor("a");
    press(player, 2);
    expect(saved()).toEqual({ a: 1 });
    jest.advanceTimersByTime(1000);
    expect(saved()).toEqual({ a: 1 });
    jest.advanceTimersByTime(3000);
    expect(saved()).toEqual({ a: 2 });
  });

  it("saves no steps done on reset", () => {
    setReducedMotion(true);
    const { playerFor, saved } = makeState();
    const player = playerFor("a");
    press(player, 3);
    player.reset();
    expect(saved()).toEqual({});
  });

  it("a player for a conversation not stepped yet starts with nothing done", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    press(playerFor("a"), 4);
    const other = playerFor("b");
    expect(other.marker).toBe(0);
    expect(other.scene).toEqual(emptyScene(SIZES));
  });

  it("a new player for a conversation shows the steps saved for it", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    press(playerFor("a"), 4);
    const again = playerFor("a");
    expect(again.marker).toBe(4);
    expect(again.scene).toEqual(sceneAt(SIZES, 4));
  });

  it("a step cut short comes back as the step before it, not playing", () => {
    const { playerFor } = makeState();
    const first = playerFor("a");
    press(first, 2);
    jest.advanceTimersByTime(500);
    first.stop();
    const again = playerFor("a");
    expect(again.marker).toBe(1);
    expect(again.running).toBeUndefined();
    expect(again.scene).toEqual(sceneAt(SIZES, 1));
    expect(jest.getTimerCount()).toBe(0);
  });
});
