import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { emptyScene } from "../../core/network-diagram/scene";
import { sceneAt } from "./step-timeline";
import { useStepPlayer } from "./use-step-player";

const SIZES = [10, 8, 6, 2];

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: reduce }),
  });
}

/** The player, over progress kept for each conversation the way the view keeps it. `saved` shows what was written. */
function renderPlayer(conversationId = "a") {
  const saved: Record<string, number> = {};
  const view = renderHook(({ key }) => {
    const [progress, setProgress] = useState<Record<string, number>>({});
    const setStepsDone = (stepsDone: number) => {
      saved[key] = stepsDone;
      setProgress(previous => ({ ...previous, [key]: stepsDone }));
    };
    return useStepPlayer(SIZES, { key, stepsDone: progress[key] ?? 0, setStepsDone });
  }, { initialProps: { key: conversationId } });
  return { ...view, saved };
}

describe("useStepPlayer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as any).matchMedia;
  });

  it("starts with nothing done", () => {
    const { result } = renderPlayer();
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.shownStep).toBe(0);
    expect(result.current.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps to the step before, then plays the step", () => {
    const { result } = renderPlayer();
    act(() => result.current.play(2));
    expect(result.current.stepsDone).toBe(1);
    expect(result.current.shownStep).toBe(2);
    expect(result.current.scene.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(result.current.scene.edgeDraw[0].every(x => x === 0)).toBe(true);

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.scene.edgeDraw[0][0]).toBe(1);
    expect(result.current.scene.edgeDraw[0][9]).toBe(0);

    act(() => jest.advanceTimersByTime(3000));
    expect(result.current.stepsDone).toBe(2);
    expect(result.current.shownStep).toBe(2);
    expect(result.current.scene).toEqual(sceneAt(SIZES, 2));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("replays a step when it is pressed again", () => {
    const { result } = renderPlayer();
    act(() => result.current.play(2));
    act(() => jest.advanceTimersByTime(4000));
    act(() => result.current.play(2));
    expect(result.current.stepsDone).toBe(1);
    expect(result.current.shownStep).toBe(2);
  });

  it("a new step replaces the one playing", () => {
    const { result } = renderPlayer();
    act(() => result.current.play(3));
    act(() => jest.advanceTimersByTime(500));
    act(() => result.current.play(2));
    expect(jest.getTimerCount()).toBe(1);
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current.stepsDone).toBe(2);
    expect(result.current.scene).toEqual(sceneAt(SIZES, 2));
  });

  it("resets to nothing and stops a step that is playing", () => {
    const { result } = renderPlayer();
    act(() => result.current.play(3));
    act(() => jest.advanceTimersByTime(500));
    act(() => result.current.reset());
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.shownStep).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.scene).toEqual(emptyScene(SIZES));
  });

  it("jumps straight to the end of a step under reduced motion", () => {
    setReducedMotion(true);
    const { result } = renderPlayer();
    act(() => result.current.play(3));
    expect(result.current.stepsDone).toBe(3);
    expect(result.current.scene).toEqual(sceneAt(SIZES, 3));
    expect(jest.getTimerCount()).toBe(0);
  });

  it("saves the step before while a step plays, and the step only once it ends", () => {
    const { result, saved } = renderPlayer("a");
    act(() => result.current.play(2));
    expect(saved).toEqual({ a: 1 });
    act(() => jest.advanceTimersByTime(1000));
    expect(saved).toEqual({ a: 1 });
    act(() => jest.advanceTimersByTime(3000));
    expect(saved).toEqual({ a: 2 });
  });

  it("saves no steps done on reset", () => {
    setReducedMotion(true);
    const { result, saved } = renderPlayer("a");
    act(() => result.current.play(3));
    act(() => result.current.reset());
    expect(saved).toEqual({ a: 0 });
  });

  it("starts a conversation not stepped yet with nothing done", () => {
    setReducedMotion(true);
    const { result, rerender } = renderPlayer("a");
    act(() => result.current.play(4));
    expect(result.current.stepsDone).toBe(4);
    rerender({ key: "b" });
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.scene).toEqual(emptyScene(SIZES));
  });

  it("changing the conversation mid-step stops it, leaving the step before saved", () => {
    const { result, rerender, saved } = renderPlayer("a");
    act(() => result.current.play(2));
    act(() => jest.advanceTimersByTime(500));
    rerender({ key: "b" });
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.scene).toEqual(emptyScene(SIZES));
    expect(saved).toEqual({ a: 1 });
  });

  it("brings a conversation's progress back when returning to it", () => {
    setReducedMotion(true);
    const { result, rerender } = renderPlayer("a");
    act(() => result.current.play(4));
    rerender({ key: "b" });
    rerender({ key: "a" });
    expect(result.current.stepsDone).toBe(4);
    expect(result.current.shownStep).toBe(4);
    expect(result.current.scene).toEqual(sceneAt(SIZES, 4));
  });

  it("returns to the step before one that was cut short, without playing it", () => {
    const { result, rerender } = renderPlayer("a");
    act(() => result.current.play(2));
    act(() => jest.advanceTimersByTime(500));
    rerender({ key: "b" });
    rerender({ key: "a" });
    expect(result.current.stepsDone).toBe(1);
    expect(result.current.shownStep).toBe(1);
    expect(result.current.scene).toEqual(sceneAt(SIZES, 1));
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.scene).toEqual(sceneAt(SIZES, 1));
  });

  it("stops the clock when unmounted, leaving the step before saved", () => {
    const { result, unmount, saved } = renderPlayer();
    act(() => result.current.play(2));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    expect(saved).toEqual({ a: 1 });
  });
});
