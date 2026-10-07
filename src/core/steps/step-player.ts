import { action, computed, computedStruct, observableRef } from "mobx";

/** A point on a view's timeline where the scene rests and progress is saved. 0 is the start. */
export type Marker = number;

/** The animation between two markers. */
export interface Segment {
  from: Marker;
  to: Marker;
}

/** One frame of a run: the button that started it, its segment, and the time into it. */
export interface Frame extends Segment {
  button: string;
  /** Milliseconds since the run started. */
  t: number;
}

/** What a view's steps draw. Pure: the same marker and frame always give the same scene. */
export interface StepTimeline<S> {
  /** How long `segment` takes to play, in milliseconds. */
  duration(segment: Segment): number;
  /** The scene resting at `marker`, or at `frame` of the run playing. */
  sceneAt(marker: Marker, frame?: Frame): S;
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
 * Only the run playing is held here, and the clock runs only while it plays. So `stop()` is all
 * the cleanup there is, and the player can play again after it. The constructor must not start
 * anything: the view may make players that React never commits, and those are never stopped. Read
 * the values inside an `observer`.
 */
export class StepPlayer<S> {
  @observableRef private accessor frame: Frame | undefined = undefined;
  /** The requestAnimationFrame callback waiting to run, while a run plays. */
  private frameRequest: number | undefined;

  constructor(
    private readonly timeline: StepTimeline<S>,
    private readonly progress: StepProgress,
  ) {}

  get marker(): Marker {
    return this.progress.marker;
  }

  /** The frame of the run playing, replaced on every frame. Undefined at rest. */
  get currentFrame(): Frame | undefined {
    return this.frame;
  }

  /**
   * The button and segment of the run playing, without its time. Compared by value, so it changes
   * when a run starts or ends, not on every frame like `currentFrame`. The step row reads this, so
   * it re-renders once per run.
   */
  @computedStruct
  get playing(): { button: string; segment: Segment } | undefined {
    const frame = this.frame;
    return frame && { button: frame.button, segment: { from: frame.from, to: frame.to } };
  }

  @computed
  get scene(): S {
    return this.timeline.sceneAt(this.progress.marker, this.frame);
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
    this.frame = { button, from, to, t: 0 };
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
      this.frame = { button, from, to, t };
      this.frameRequest = requestAnimationFrame(tick);
    });
    this.frameRequest = requestAnimationFrame(tick);
  }

  @action
  reset() {
    this.stop();
    this.progress.setMarker(0);
  }

  /** Drops a run that is playing. The marker stays at its `from`. */
  @action
  stop() {
    if (this.frameRequest !== undefined) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = undefined;
    }
    this.frame = undefined;
  }
}
