import { action, IReactionDisposer, observableRef, reaction } from "mobx";
import { Scene } from "../../core/network-diagram/scene";
import { SharedState } from "../../core/state/shared-state";
import { RunningStep, sceneAt, Step, stepDuration } from "./step-timeline";
import { TraceACaseState } from "./trace-a-case-state";

interface Playing {
  /** The conversation the step is playing for. */
  conversationId: string;
  running: RunningStep;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays Trace a Case's steps on a requestAnimationFrame clock, and keeps the steps done for each
 * conversation in `state`. A step saves the step before when it starts and itself when it ends,
 * so a step still playing is never saved. Changing the shared conversation drops a step that is
 * playing.
 *
 * Only the step playing is held here, and only while it plays: the clock and the watch on the
 * conversation start with a step and end with it, so `stop()` is all the cleanup there is, and the
 * player can play again after it. Its values are observable, so read them inside an `observer`.
 * `columnSizes` must not change.
 */
export class StepPlayer {
  @observableRef private accessor playing: Playing | undefined = undefined;
  private frame: number | undefined;
  private stopWatching: IReactionDisposer | undefined;

  constructor(
    private readonly columnSizes: readonly number[],
    private readonly state: TraceACaseState,
    private readonly shared: SharedState,
  ) {}

  /** Steps completed for the conversation, 0–4. */
  stepsDone(conversationId: string): number {
    return this.state.stepsDone(conversationId);
  }

  /** The step whose button shows as pressed: the one playing, else the last one done (0 for none). */
  shownStep(conversationId: string): number {
    return this.running(conversationId)?.step ?? this.stepsDone(conversationId);
  }

  scene(conversationId: string): Scene {
    return sceneAt(this.columnSizes, this.stepsDone(conversationId), this.running(conversationId));
  }

  /** Jumps to the step before `step`, then plays `step`. Pressing the step shown replays it. */
  @action
  play(conversationId: string, step: Step) {
    this.stop();
    if (prefersReducedMotion()) {
      this.state.setStepsDone(conversationId, step);
      return;
    }
    this.state.setStepsDone(conversationId, step - 1);
    this.playing = { conversationId, running: { step, t: 0 } };
    this.stopWatching = reaction(() => this.shared.conversationId, () => this.stop());
    const duration = stepDuration(step, this.columnSizes);
    let start: number | undefined;
    const tick = action((now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        this.stop();
        this.state.setStepsDone(conversationId, step);
        return;
      }
      this.playing = { conversationId, running: { step, t } };
      this.frame = requestAnimationFrame(tick);
    });
    this.frame = requestAnimationFrame(tick);
  }

  @action
  reset(conversationId: string) {
    this.stop();
    this.state.setStepsDone(conversationId, 0);
  }

  /** Drops a step that is playing. Its conversation keeps the step before it. */
  @action
  stop() {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.stopWatching?.();
    this.stopWatching = undefined;
    this.playing = undefined;
  }

  private running(conversationId: string): RunningStep | undefined {
    return this.playing?.conversationId === conversationId ? this.playing.running : undefined;
  }
}
