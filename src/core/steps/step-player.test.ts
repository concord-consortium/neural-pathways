import { action, makeObservable, observable } from "mobx";
import { Frame, Marker, StepPlayer, StepProgress, StepTimeline } from "./step-player";

interface TestScene {
  marker: Marker;
  frame?: Frame;
}

/** A segment takes a second for each marker it moves on. */
const timeline: StepTimeline<TestScene> = {
  duration: ({ from, to }) => (to - from) * 1000,
  sceneAt: (marker, frame) => (frame ? { marker, frame } : { marker }),
};

class Progress implements StepProgress {
  marker = 0;

  constructor() {
    makeObservable(this, { marker: observable, setMarker: action });
  }

  setMarker(marker: Marker) {
    this.marker = marker;
  }
}

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: reduce }),
  });
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

  it("starts at the progress saved, with nothing running", () => {
    const progress = new Progress();
    progress.setMarker(2);
    const player = new StepPlayer(timeline, progress);
    expect(player.marker).toBe(2);
    expect(player.currentFrame).toBeUndefined();
    expect(player.scene).toEqual({ marker: 2 });
  });

  it("saves `from`, plays the run, then saves `to`", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("b", { from: 1, to: 2 });
    expect(progress.marker).toBe(1);
    expect(player.currentFrame).toEqual({ button: "b", from: 1, to: 2, t: 0 });
    jest.advanceTimersByTime(500);
    expect(player.currentFrame?.t).toBeGreaterThan(400);
    expect(player.currentFrame?.t).toBeLessThan(500);
    expect(player.scene).toEqual({ marker: 1, frame: player.currentFrame });
    expect(progress.marker).toBe(1);
    jest.advanceTimersByTime(600);
    expect(player.currentFrame).toBeUndefined();
    expect(progress.marker).toBe(2);
    expect(player.scene).toEqual({ marker: 2 });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("drops a run when another is pressed: the first's `to` is never saved", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", { from: 0, to: 3 });
    jest.advanceTimersByTime(1000);
    player.play("b", { from: 1, to: 2 });
    expect(player.currentFrame?.button).toBe("b");
    expect(jest.getTimerCount()).toBe(1);
    // Past where `a` would have ended, 3000 ms after it started.
    jest.advanceTimersByTime(2500);
    expect(player.currentFrame).toBeUndefined();
    expect(progress.marker).toBe(2);
  });

  it("restarts a run when its button is pressed again, with one clock", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", { from: 1, to: 2 });
    jest.advanceTimersByTime(500);
    player.play("a", { from: 1, to: 2 });
    expect(player.currentFrame).toEqual({ button: "a", from: 1, to: 2, t: 0 });
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1100);
    expect(progress.marker).toBe(2);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("saves `to` straight away under reduced motion", () => {
    setReducedMotion(true);
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", { from: 0, to: 3 });
    expect(progress.marker).toBe(3);
    expect(player.currentFrame).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stop() cancels the clock and keeps `from`, and the player plays again afterward", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", { from: 1, to: 2 });
    player.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(progress.marker).toBe(1);
    expect(player.currentFrame).toBeUndefined();
    player.play("a", { from: 1, to: 2 });
    jest.advanceTimersByTime(1100);
    expect(progress.marker).toBe(2);
  });

  it("reset() stops a run and saves 0", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", { from: 2, to: 3 });
    jest.advanceTimersByTime(200);
    player.reset();
    expect(progress.marker).toBe(0);
    expect(player.currentFrame).toBeUndefined();
    jest.advanceTimersByTime(2000);
    expect(progress.marker).toBe(0);
  });
});
