import { sceneAt, Step, stepDuration, STEPS } from "../../core/network-diagram/pass-steps";
import { Scene } from "../../core/network-diagram/scene";
import { StepButton } from "../../core/steps/step-buttons";
import { Marker, StepProgress, StepTimeline } from "../../core/steps/step-player";
import { TraceACaseState } from "./trace-a-case-state";

/**
 * Step 1 to Step 4. Each jumps to the step before it and plays, as in the prototype, so none is
 * ever disabled. The step the timeline rests at shows as pressed.
 */
export const TRACE_BUTTONS: readonly StepButton[] = STEPS.map(step => ({
  key: `step-${step}`,
  label: `Step ${step}`,
  segmentToPlayWhenAt: () => ({ from: step - 1, to: step }),
  showAsPressedWhenAt: (marker: Marker) => marker === step,
}));

/** The pass steps as Trace a Case plays them: marker k is k steps done, and a run to it plays step k. */
export function traceTimeline(columnSizes: readonly number[]): StepTimeline<Scene> {
  return {
    duration: ({ to }) => stepDuration(to as Step, columnSizes),
    sceneAt: (marker, run) => sceneAt(columnSizes, marker, run && { step: run.to as Step, t: run.t }),
  };
}

/** One conversation's marker, kept in the view's state. */
export function traceProgress(state: TraceACaseState, conversationId: string): StepProgress {
  return {
    get marker() {
      return state.marker(conversationId);
    },
    setMarker: (marker: Marker) => state.setMarker(conversationId, marker),
  };
}
