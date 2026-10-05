import { emptyScene } from "../../core/network-diagram/scene";
import { sceneAt } from "../../core/network-diagram/pass-steps";
import { StepPlayer } from "./step-player";
import { TraceACaseState } from "./trace-a-case-state";

const SIZES = [10, 8, 6, 2];

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
  const playerFor = (conversationId: string) => new StepPlayer(SIZES, state, conversationId);
  /** The steps saved, by conversation. */
  const saved = () => ({ ...state.stepsByConversation });
  return { playerFor, saved };
}

describe("StepPlayer", () => {
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
    expect(player.stepsDone).toBe(0);
    expect(player.shownStep).toBe(0);
    expect(player.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps to the step before, then plays the step", () => {
    const player = makeState().playerFor("a");
    player.play(2);
    expect(player.stepsDone).toBe(1);
    expect(player.shownStep).toBe(2);
    expect(player.scene.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(player.scene.edgeDraw[0].every(x => x === 0)).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(player.scene.edgeDraw[0][0]).toBe(1);
    expect(player.scene.edgeDraw[0][9]).toBe(0);

    jest.advanceTimersByTime(3000);
    expect(player.stepsDone).toBe(2);
    expect(player.shownStep).toBe(2);
    expect(player.scene).toEqual(sceneAt(SIZES, 2));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("replays a step when it is pressed again", () => {
    const player = makeState().playerFor("a");
    player.play(2);
    jest.advanceTimersByTime(4000);
    player.play(2);
    expect(player.stepsDone).toBe(1);
    expect(player.shownStep).toBe(2);
  });

  it("a new step replaces the one playing", () => {
    const player = makeState().playerFor("a");
    player.play(3);
    jest.advanceTimersByTime(500);
    player.play(2);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(4000);
    expect(player.stepsDone).toBe(2);
    expect(player.scene).toEqual(sceneAt(SIZES, 2));
  });

  it("resets to nothing and stops a step that is playing", () => {
    const player = makeState().playerFor("a");
    player.play(3);
    jest.advanceTimersByTime(500);
    player.reset();
    expect(player.stepsDone).toBe(0);
    expect(player.shownStep).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(player.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps straight to the end of a step under reduced motion", () => {
    setReducedMotion(true);
    const player = makeState().playerFor("a");
    player.play(3);
    expect(player.stepsDone).toBe(3);
    expect(player.scene).toEqual(sceneAt(SIZES, 3));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("saves the step before while a step plays, and the step only once it ends", () => {
    const { playerFor, saved } = makeState();
    const player = playerFor("a");
    player.play(2);
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
    player.play(3);
    player.reset();
    expect(saved()).toEqual({});
  });

  it("stop() cancels the clock and leaves the step before saved, and the player still plays after", () => {
    const { playerFor, saved } = makeState();
    const player = playerFor("a");
    player.play(2);
    player.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(saved()).toEqual({ a: 1 });
    expect(player.shownStep).toBe(1);
    player.play(2);
    jest.advanceTimersByTime(4000);
    expect(saved()).toEqual({ a: 2 });
  });

  it("a player for a conversation not stepped yet starts with nothing done", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    playerFor("a").play(4);
    const other = playerFor("b");
    expect(other.stepsDone).toBe(0);
    expect(other.scene).toEqual(emptyScene(SIZES));
  });

  it("a new player for a conversation shows the steps saved for it", () => {
    setReducedMotion(true);
    const { playerFor } = makeState();
    playerFor("a").play(4);
    const again = playerFor("a");
    expect(again.stepsDone).toBe(4);
    expect(again.shownStep).toBe(4);
    expect(again.scene).toEqual(sceneAt(SIZES, 4));
  });

  it("a step cut short comes back as the step before it, not playing", () => {
    const { playerFor } = makeState();
    const first = playerFor("a");
    first.play(2);
    jest.advanceTimersByTime(500);
    first.stop();
    const again = playerFor("a");
    expect(again.stepsDone).toBe(1);
    expect(again.shownStep).toBe(1);
    expect(again.scene).toEqual(sceneAt(SIZES, 1));
    expect(jest.getTimerCount()).toBe(0);
  });
});
