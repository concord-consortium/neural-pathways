import { action, computed, observableRef } from "mobx";

/** A step playing: the button that started it, the steps done it runs from and to, and its time. */
export interface Run {
  button: string;
  from: number;
  to: number;
  /** Milliseconds since it started. */
  t: number;
}

/** What a view's steps draw. Pure: the same steps done and run always give the same scene. */
export interface StepTimeline<S> {
  /** How long a run from `from` steps done to `to` takes, in milliseconds. */
  duration(from: number, to: number): number;
  /** The scene with `done` steps done, and `run` part way when one is playing. */
  sceneAt(done: number, run?: Run): S;
}

/** Where a view keeps its steps done. Reads must be observable, such as a mobx-keystone model's. */
export interface StepProgress {
  readonly done: number;
  setDone(n: number): void;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays a view's steps on a requestAnimationFrame clock and keeps its steps done in `progress`. A
 * run saves the steps done it starts from when it starts, and those it ends at when it ends, so a
 * run still playing is never saved. Pressing anything during a run drops it.
 *
 * Only the run playing is held here, and the clock runs only while it plays, so `stop()` is all the
 * cleanup there is, and the player can play again after it. Its values are observable, so read
 * them inside an `observer`.
 */
export class StepPlayer<S> {
  @observableRef private accessor run: Run | undefined = undefined;
  private frame: number | undefined;

  constructor(
    private readonly timeline: StepTimeline<S>,
    private readonly progress: StepProgress,
  ) {}

  get done(): number {
    return this.progress.done;
  }

  get running(): Run | undefined {
    return this.run;
  }

  @computed
  get scene(): S {
    return this.timeline.sceneAt(this.progress.done, this.run);
  }

  /** Jumps to `from` steps done, then plays to `to`. Under reduced motion, jumps straight to `to`. */
  @action
  play(button: string, from: number, to: number) {
    this.stop();
    if (prefersReducedMotion()) {
      this.progress.setDone(to);
      return;
    }
    this.progress.setDone(from);
    this.run = { button, from, to, t: 0 };
    const duration = this.timeline.duration(from, to);
    let start: number | undefined;
    const tick = action((now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        this.stop();
        this.progress.setDone(to);
        return;
      }
      this.run = { button, from, to, t };
      this.frame = requestAnimationFrame(tick);
    });
    this.frame = requestAnimationFrame(tick);
  }

  @action
  reset() {
    this.stop();
    this.progress.setDone(0);
  }

  /** Drops a run that is playing. The steps done stay at its `from`. */
  @action
  stop() {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.run = undefined;
  }
}
