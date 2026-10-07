import { phaseDuration, PHASES, sceneAt, toPhase } from "../../core/network-diagram/forward-pass-phases";
import { Scene } from "../../core/network-diagram/scene";
import { StepButton } from "../../core/steps/step-buttons";
import { Marker, StepProgress, StepTimeline } from "../../core/steps/step-player";
import { TraceACaseState } from "./trace-a-case-state";

/**
 * Step 1 to Step 4. Each jumps to the step before it and plays, as in the prototype, so none is
 * ever disabled. The step the timeline rests at is marked as current.
 */
export const TRACE_BUTTONS: readonly StepButton[] = PHASES.map(phase => ({
  key: `step-${phase}`,
  label: `Step ${phase}`,
  segmentToPlayWhenAt: () => ({ from: phase - 1, to: phase }),
  showAsCurrentWhenAt: (marker: Marker) => marker === phase,
}));

/**
 * The forward pass's phases as Trace a Case plays them: Step k is phase k, so marker k is k phases
 * done, and the segment to it plays phase k.
 */
export function traceTimeline(columnSizes: readonly number[]): StepTimeline<Scene> {
  return {
    duration: ({ to }) => phaseDuration(toPhase(to), columnSizes),
    sceneAt: (marker, frame) => sceneAt(columnSizes, marker, frame && { phase: toPhase(frame.to), t: frame.t }),
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
