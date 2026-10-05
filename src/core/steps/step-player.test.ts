import { action, makeObservable, observable } from "mobx";
import { Run, StepPlayer, StepProgress, StepTimeline } from "./step-player";

interface TestScene {
  done: number;
  run?: Run;
}

/** A run takes a second for each step it covers. */
const timeline: StepTimeline<TestScene> = {
  duration: (from, to) => (to - from) * 1000,
  sceneAt: (done, run) => (run ? { done, run } : { done }),
};

class Progress implements StepProgress {
  done = 0;

  constructor() {
    makeObservable(this, { done: observable, setDone: action });
  }

  setDone(n: number) {
    this.done = n;
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
    progress.setDone(2);
    const player = new StepPlayer(timeline, progress);
    expect(player.done).toBe(2);
    expect(player.running).toBeUndefined();
    expect(player.scene).toEqual({ done: 2 });
  });

  it("saves `from`, plays the run, then saves `to`", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("b", 1, 2);
    expect(progress.done).toBe(1);
    expect(player.running).toEqual({ button: "b", from: 1, to: 2, t: 0 });
    jest.advanceTimersByTime(500);
    expect(player.running?.t).toBeGreaterThan(400);
    expect(player.running?.t).toBeLessThan(500);
    expect(player.scene).toEqual({ done: 1, run: player.running });
    expect(progress.done).toBe(1);
    jest.advanceTimersByTime(600);
    expect(player.running).toBeUndefined();
    expect(progress.done).toBe(2);
    expect(player.scene).toEqual({ done: 2 });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("drops a run when another is pressed, keeping the first run's `from`", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", 0, 3);
    jest.advanceTimersByTime(1000);
    player.play("b", 1, 2);
    expect(progress.done).toBe(1);
    expect(player.running?.button).toBe("b");
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1100);
    expect(progress.done).toBe(2);
  });

  it("restarts a run when its button is pressed again", () => {
    const player = new StepPlayer(timeline, new Progress());
    player.play("a", 1, 2);
    jest.advanceTimersByTime(500);
    player.play("a", 1, 2);
    expect(player.running).toEqual({ button: "a", from: 1, to: 2, t: 0 });
  });

  it("saves `to` straight away under reduced motion", () => {
    setReducedMotion(true);
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", 0, 3);
    expect(progress.done).toBe(3);
    expect(player.running).toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stop() cancels the clock and keeps `from`, and the player plays again afterward", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", 1, 2);
    player.stop();
    expect(jest.getTimerCount()).toBe(0);
    expect(progress.done).toBe(1);
    expect(player.running).toBeUndefined();
    player.play("a", 1, 2);
    jest.advanceTimersByTime(1100);
    expect(progress.done).toBe(2);
  });

  it("reset() stops a run and saves 0", () => {
    const progress = new Progress();
    const player = new StepPlayer(timeline, progress);
    player.play("a", 2, 3);
    jest.advanceTimersByTime(200);
    player.reset();
    expect(progress.done).toBe(0);
    expect(player.running).toBeUndefined();
    jest.advanceTimersByTime(2000);
    expect(progress.done).toBe(0);
  });
});
