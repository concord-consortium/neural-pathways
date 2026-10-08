import { action, computed, computedStruct, observableRef } from "mobx";
import { durationScale, PlaybackSettings } from "./playback";

/** A point on a view's timeline where the scene rests and progress is stored. 0 is the start. */
export type Marker = number;

/** The animation between two markers. */
export interface Segment {
  from: Marker;
  to: Marker;
}

/** One play of a segment, started by a button. */
export interface Run extends Segment {
  /** The key of the button that started it. */
  button: string;
}

/** A run at one moment: the run, and the time into it. */
export interface Frame extends Run {
  /**
   * Timeline time since the run started: milliseconds at normal speed, which the player stretches
   * at slow speed and squeezes at fast.
   */
  t: number;
}

/** What a view's steps draw. Pure: the same marker and frame always give the same scene. */
export interface StepTimeline<S> {
  /** How long `segment` takes to play, in timeline time: milliseconds at normal speed. */
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
 * Plays a view's segments on a requestAnimationFrame clock, at the speed in `settings`, and keeps
 * its marker in `progress`. The clock advances by the real time between frames divided by the
 * speed's `durationScale`, so a timeline is written once, at normal speed, and a speed change
 * during a run applies from the next frame without a jump. With Animate off a run jumps to its
 * end, and turning Animate off during a run finishes it. A run stores the marker it starts from
 * when it starts, and the one it ends at when it ends, so a run still playing is never stored.
 * Playing, resetting or stopping during a run drops it.
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
    private readonly settings: PlaybackSettings,
  ) {}

  get marker(): Marker {
    return this.progress.marker;
  }

  /** The frame of the run playing, replaced on every frame. Undefined at rest. */
  get currentFrame(): Frame | undefined {
    return this.frame;
  }

  /**
   * The run playing, without its time. Compared by value, so it changes when a run starts or ends,
   * not on every frame like `currentFrame`. The step row reads this, so it re-renders only when a
   * run starts or ends.
   */
  @computedStruct
  get currentRun(): Run | undefined {
    const frame = this.frame;
    return frame && { button: frame.button, from: frame.from, to: frame.to };
  }

  @computed
  get scene(): S {
    return this.timeline.sceneAt(this.progress.marker, this.frame);
  }

  /**
   * Jumps to `segment.from`, then plays to `segment.to`. With Animate off, or under reduced motion,
   * jumps straight to `to`.
   */
  @action
  play(button: string, segment: Segment) {
    const { from, to } = segment;
    // First, so a timeline that throws for this segment leaves the player as it was.
    const duration = this.timeline.duration(segment);
    this.stop();
    if (!this.settings.animate || prefersReducedMotion()) {
      this.progress.setMarker(to);
      return;
    }
    this.progress.setMarker(from);
    this.frame = { button, from, to, t: 0 };
    let t = 0;
    let lastFrameAt: number | undefined;
    const tick = action((now: number) => {
      // Read on every frame, so a change to either setting applies to the run already playing.
      const { animate, speed } = this.settings;
      if (animate) {
        t += (now - (lastFrameAt ?? now)) / durationScale(speed);
        lastFrameAt = now;
      }
      if (!animate || t >= duration) {
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
