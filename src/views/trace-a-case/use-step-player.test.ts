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

function renderPlayer(resetKey: string | undefined = "a") {
  return renderHook(({ key }) => useStepPlayer(SIZES, key), { initialProps: { key: resetKey } });
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

  it("starts over when the conversation changes", () => {
    setReducedMotion(true);
    const { result, rerender } = renderPlayer("a");
    act(() => result.current.play(4));
    expect(result.current.stepsDone).toBe(4);
    rerender({ key: "b" });
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.scene).toEqual(emptyScene(SIZES));
  });

  it("changing the conversation mid-step stops it", () => {
    const { result, rerender } = renderPlayer("a");
    act(() => result.current.play(2));
    act(() => jest.advanceTimersByTime(500));
    rerender({ key: "b" });
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.stepsDone).toBe(0);
    expect(result.current.scene).toEqual(emptyScene(SIZES));
  });

  it("stops the clock when unmounted", () => {
    const { result, unmount } = renderPlayer();
    act(() => result.current.play(2));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
