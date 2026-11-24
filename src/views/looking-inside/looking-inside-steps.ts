import { phaseDuration, PHASES, sceneAt, toPhase } from "../../core/network-diagram/forward-pass-phases";
import { Scene } from "../../core/network-diagram/scene";
import { StepButton } from "../../core/steps/step-button";
import { Marker, StepProgress, StepTimeline } from "../../core/steps/step-player";
import { LookingInsideState } from "./looking-inside-state";
import { inputFillAt, step1Duration } from "./word-flights";

/**
 * Step 1 to Step 4. Each jumps to the marker before its own and plays, as in the prototype, so none
 * is ever unavailable. The button for the marker the timeline rests at is current.
 */
export const LOOKING_INSIDE_BUTTONS: readonly StepButton[] = PHASES.map(phase => ({
  key: `step-${phase}`,
  label: `Step ${phase}`,
  segmentToPlayWhenAt: () => ({ from: phase - 1, to: phase }),
  showAsCurrentWhenAt: (marker: Marker) => marker === phase,
}));

/**
 * What Looking Inside draws: the network's scene, and the time into Step 1, from which the overlay
 * places the word flights.
 */
export interface LookingInsideScene {
  network: Scene;
  /** ms into Step 1 while it plays; undefined otherwise */
  step1Time?: number;
}

/**
 * Looking Inside a Neural Network's timeline, where marker k is k steps done. Step 1 is the message's
 * words flying to the input neurons; Steps 2–4 play phases 2–4 of `forward-pass-phases.ts`. Step 1's
 * length depends only on the number of inputs; the inputs' fill depends on the word count, so the
 * timeline is made per message.
 */
export function lookingInsideTimeline(
  columnSizes: readonly number[], wordCount: number,
): StepTimeline<LookingInsideScene> {
  return {
    duration: ({ from, to }) => {
      // sceneAt draws only the phase a run ends on, so a run must be that one phase.
      if (from !== to - 1) {
        throw new RangeError(`Looking Inside a Neural Network plays one phase at a time, not ${from} to ${to}`);
      }
      return to === 1 ? step1Duration(columnSizes[0]) : phaseDuration(toPhase(to), columnSizes);
    },
    sceneAt: (marker, frame) => {
      if (frame?.to === 1) {
        // Not the shared phase's scene, which fills the inputs on its own clock: the empty scene at
        // marker 0, whose inputs the flights fill as the words land.
        const network = sceneAt(columnSizes, 0);
        network.nodeFill[0] = inputFillAt(frame.t, columnSizes[0], wordCount);
        return { network, step1Time: frame.t };
      }
      return { network: sceneAt(columnSizes, marker, frame && { phase: toPhase(frame.to), t: frame.t }) };
    },
  };
}

/** One message's marker, kept in the view's state. */
export function lookingInsideProgress(state: LookingInsideState, messageId: string): StepProgress {
  return {
    get marker() {
      return state.marker(messageId);
    },
    setMarker: (marker: Marker) => state.setMarker(messageId, marker),
  };
}
