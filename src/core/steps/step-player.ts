import { action, computed, observableRef } from "mobx";

/** A point on a view's timeline where the scene rests and progress is saved. 0 is the start. */
export type Marker = number;

/** The animation between two markers. */
export interface Segment {
  from: Marker;
  to: Marker;
}

/** A segment playing: the button that started it, and its time. */
export interface Run extends Segment {
  button: string;
  /** Milliseconds since it started. */
  t: number;
}

/** What a view's steps draw. Pure: the same marker and run always give the same scene. */
export interface StepTimeline<S> {
  /** How long `segment` takes to play, in milliseconds. */
  duration(segment: Segment): number;
  /** The scene resting at `marker`, with `run` part way when one is playing. */
  sceneAt(marker: Marker, run?: Run): S;
}

/** Where a view keeps its marker. Reads must be observable, such as a mobx-keystone model's. */
export interface StepProgress {
  readonly marker: Marker;
  setMarker(marker: Marker): void;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays a view's segments on a requestAnimationFrame clock and keeps its marker in `progress`. A
 * run saves the marker it starts from when it starts, and the one it ends at when it ends, so a
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

  get marker(): Marker {
    return this.progress.marker;
  }

  get running(): Run | undefined {
    return this.run;
  }

  @computed
  get scene(): S {
    return this.timeline.sceneAt(this.progress.marker, this.run);
  }

  /** Jumps to `segment.from`, then plays to `segment.to`. Under reduced motion, jumps straight to `to`. */
  @action
  play(button: string, segment: Segment) {
    const { from, to } = segment;
    this.stop();
    if (prefersReducedMotion()) {
      this.progress.setMarker(to);
      return;
    }
    this.progress.setMarker(from);
    this.run = { button, from, to, t: 0 };
    const duration = this.timeline.duration(segment);
    let start: number | undefined;
    const tick = action((now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        this.stop();
        this.progress.setMarker(to);
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
    this.progress.setMarker(0);
  }

  /** Drops a run that is playing. The marker stays at its `from`. */
  @action
  stop() {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.run = undefined;
  }
}
