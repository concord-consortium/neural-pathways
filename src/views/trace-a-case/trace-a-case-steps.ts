import { sceneAt, Step, stepDuration, STEPS } from "../../core/network-diagram/pass-steps";
import { Scene } from "../../core/network-diagram/scene";
import { StepButton } from "../../core/steps/step-buttons";
import { StepProgress, StepTimeline } from "../../core/steps/step-player";
import { TraceACaseState } from "./trace-a-case-state";

/**
 * Step 1 to Step 4. Each jumps to the step before it and plays, as in the prototype, so none is
 * ever disabled. The last step done shows as pressed.
 */
export const TRACE_BUTTONS: readonly StepButton[] = STEPS.map(step => ({
  key: `step-${step}`,
  label: `Step ${step}`,
  run: () => ({ from: step - 1, to: step }),
  showsDone: (done: number) => done === step,
}));

/** The pass steps as Trace a Case plays them: a run to step k plays step k. */
export function traceTimeline(columnSizes: readonly number[]): StepTimeline<Scene> {
  return {
    duration: (_from, to) => stepDuration(to as Step, columnSizes),
    sceneAt: (done, run) => sceneAt(columnSizes, done, run && { step: run.to as Step, t: run.t }),
  };
}

/** One conversation's steps done, kept in the view's state. */
export function traceProgress(state: TraceACaseState, conversationId: string): StepProgress {
  return {
    get done() {
      return state.stepsDone(conversationId);
    },
    setDone: (n: number) => state.setStepsDone(conversationId, n),
  };
}
