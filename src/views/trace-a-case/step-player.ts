import { action, computed, observableRef } from "mobx";
import { Scene } from "../../core/network-diagram/scene";
import { RunningStep, sceneAt, Step, stepDuration } from "./step-timeline";
import { TraceACaseState } from "./trace-a-case-state";

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays Trace a Case's steps for one conversation on a requestAnimationFrame clock, and keeps its
 * steps done in `state`. A step saves the step before when it starts and itself when it ends, so a
 * step still playing is never saved.
 *
 * Only the step playing is held here, and the clock runs only while it plays. So `stop()` is all
 * the cleanup there is. The constructor must not start anything: the view may make players that
 * React never commits, and those are never stopped. Read the values inside an `observer`.
 * `columnSizes` must not change.
 */
export class StepPlayer {
  @observableRef private accessor running: RunningStep | undefined = undefined;
  private frame: number | undefined;

  constructor(
    private readonly columnSizes: readonly number[],
    private readonly state: TraceACaseState,
    readonly conversationId: string,
  ) {}

  /** Steps completed, 0–4. */
  get stepsDone(): number {
    return this.state.stepsDone(this.conversationId);
  }

  /**
   * The step whose button is marked current: the one playing, else the last one done (0 for none).
   * Computed, so it changes once per step, not on every frame.
   */
  @computed
  get shownStep(): number {
    return this.running?.step ?? this.stepsDone;
  }

  @computed
  get scene(): Scene {
    return sceneAt(this.columnSizes, this.stepsDone, this.running);
  }

  /** Jumps to the step before `step`, then plays `step`. Pressing the step shown replays it. */
  @action
  play(step: Step) {
    this.stop();
    if (prefersReducedMotion()) {
      this.state.setStepsDone(this.conversationId, step);
      return;
    }
    this.state.setStepsDone(this.conversationId, step - 1);
    this.running = { step, t: 0 };
    const duration = stepDuration(step, this.columnSizes);
    let start: number | undefined;
    const tick = action((now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        this.stop();
        this.state.setStepsDone(this.conversationId, step);
        return;
      }
      this.running = { step, t };
      this.frame = requestAnimationFrame(tick);
    });
    this.frame = requestAnimationFrame(tick);
  }

  @action
  reset() {
    this.stop();
    this.state.setStepsDone(this.conversationId, 0);
  }

  /** Drops a step that is playing. */
  @action
  stop() {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.running = undefined;
  }
}
