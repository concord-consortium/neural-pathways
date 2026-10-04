import { emptyScene } from "../../core/network-diagram/scene";
import { SharedState } from "../../core/state/shared-state";
import { sceneAt } from "./step-timeline";
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

function makePlayer(conversationId = "a") {
  const state = new TraceACaseState({});
  const shared = new SharedState({ conversationId });
  const player = new StepPlayer(SIZES, state, shared);
  /** Show another conversation, as the view does through the shared state. */
  const showConversation = (id: string) => shared.setConversationId(id);
  /** The steps saved, by conversation. */
  const saved = () => ({ ...state.stepsByConversation });
  return { player, showConversation, saved };
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
    const { player } = makePlayer();
    expect(player.stepsDone("a")).toBe(0);
    expect(player.shownStep("a")).toBe(0);
    expect(player.scene("a")).toEqual(emptyScene(SIZES));
  });

  it("jumps to the step before, then plays the step", () => {
    const { player } = makePlayer();
    player.play("a", 2);
    expect(player.stepsDone("a")).toBe(1);
    expect(player.shownStep("a")).toBe(2);
    expect(player.scene("a").nodeFill[0].every(x => x === 1)).toBe(true);
    expect(player.scene("a").edgeDraw[0].every(x => x === 0)).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(player.scene("a").edgeDraw[0][0]).toBe(1);
    expect(player.scene("a").edgeDraw[0][9]).toBe(0);

    jest.advanceTimersByTime(3000);
    expect(player.stepsDone("a")).toBe(2);
    expect(player.shownStep("a")).toBe(2);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 2));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("replays a step when it is pressed again", () => {
    const { player } = makePlayer();
    player.play("a", 2);
    jest.advanceTimersByTime(4000);
    player.play("a", 2);
    expect(player.stepsDone("a")).toBe(1);
    expect(player.shownStep("a")).toBe(2);
  });

  it("a new step replaces the one playing", () => {
    const { player } = makePlayer();
    player.play("a", 3);
    jest.advanceTimersByTime(500);
    player.play("a", 2);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(4000);
    expect(player.stepsDone("a")).toBe(2);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 2));
  });

  it("resets to nothing and stops a step that is playing", () => {
    const { player } = makePlayer();
    player.play("a", 3);
    jest.advanceTimersByTime(500);
    player.reset("a");
    expect(player.stepsDone("a")).toBe(0);
    expect(player.shownStep("a")).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(player.scene("a")).toEqual(emptyScene(SIZES));
  });

  it("jumps straight to the end of a step under reduced motion", () => {
    setReducedMotion(true);
    const { player } = makePlayer();
    player.play("a", 3);
    expect(player.stepsDone("a")).toBe(3);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 3));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("saves the step before while a step plays, and the step only once it ends", () => {
    const { player, saved } = makePlayer();
    player.play("a", 2);
    expect(saved()).toEqual({ a: 1 });
    jest.advanceTimersByTime(1000);
    expect(saved()).toEqual({ a: 1 });
    jest.advanceTimersByTime(3000);
    expect(saved()).toEqual({ a: 2 });
  });

  it("saves no steps done on reset", () => {
    setReducedMotion(true);
    const { player, saved } = makePlayer();
    player.play("a", 3);
    player.reset("a");
    expect(saved()).toEqual({});
  });

  it("starts a conversation not stepped yet with nothing done", () => {
    setReducedMotion(true);
    const { player, showConversation } = makePlayer();
    player.play("a", 4);
    showConversation("b");
    expect(player.stepsDone("b")).toBe(0);
    expect(player.scene("b")).toEqual(emptyScene(SIZES));
  });

  it("changing the conversation mid-step stops it, leaving the step before saved", () => {
    const { player, showConversation, saved } = makePlayer();
    player.play("a", 2);
    jest.advanceTimersByTime(500);
    showConversation("b");
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(player.scene("b")).toEqual(emptyScene(SIZES));
    expect(saved()).toEqual({ a: 1 });
  });

  it("brings a conversation's progress back when returning to it", () => {
    setReducedMotion(true);
    const { player, showConversation } = makePlayer();
    player.play("a", 4);
    showConversation("b");
    showConversation("a");
    expect(player.stepsDone("a")).toBe(4);
    expect(player.shownStep("a")).toBe(4);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 4));
  });

  it("returns to the step before one that was cut short, without playing it", () => {
    const { player, showConversation } = makePlayer();
    player.play("a", 2);
    jest.advanceTimersByTime(500);
    showConversation("b");
    showConversation("a");
    expect(player.stepsDone("a")).toBe(1);
    expect(player.shownStep("a")).toBe(1);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 1));
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(player.scene("a")).toEqual(sceneAt(SIZES, 1));
  });

  it("stop() cancels the clock and leaves the step before saved, and the player still plays after", () => {
    const { player, saved } = makePlayer();
    player.play("a", 2);
    player.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(saved()).toEqual({ a: 1 });
    expect(player.shownStep("a")).toBe(1);
    player.play("a", 2);
    jest.advanceTimersByTime(4000);
    expect(saved()).toEqual({ a: 2 });
  });
});
