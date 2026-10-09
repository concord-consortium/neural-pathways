import { phaseDuration, PHASES, sceneAt, toPhase } from "../../core/network-diagram/forward-pass-phases";
import { Scene } from "../../core/network-diagram/scene";
import { StepButton } from "../../core/steps/step-button";
import { Marker, StepProgress, StepTimeline } from "../../core/steps/step-player";
import { TraceACaseState } from "./trace-a-case-state";

/**
 * Step 1 to Step 4. Each jumps to the marker before its own and plays, as in the prototype, so none
 * is ever disabled. The button for the marker the timeline rests at is current.
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
    duration: ({ from, to }) => {
      // sceneAt draws only the phase a run ends on, so a run must be that one phase.
      if (from !== to - 1) {
        throw new RangeError(`Trace a Case plays one phase at a time, not ${from} to ${to}`);
      }
      return phaseDuration(toPhase(to), columnSizes);
    },
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
