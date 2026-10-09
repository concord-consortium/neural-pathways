import { StepButton } from "../../core/steps/step-button";
import { Marker, StepProgress } from "../../core/steps/step-player";
import { ExtractPathwaysState } from "./extract-pathways-state";

/** The most conversations Collect a Conversation gathers one at a time, as in the prototype. */
export const MAX_COLLECTED = 10;

/**
 * The marker, from Setup and the count stored in the state: 0 at the start, 1 once Setup is done,
 * and one more for each conversation collected. `limit` is how many can be collected; a stored
 * count above it reads as the limit.
 */
export function extractProgress(state: ExtractPathwaysState, limit: number): StepProgress {
  return {
    get marker() {
      return state.setupDone ? 1 + Math.min(state.collected, limit) : 0;
    },
    setMarker: (marker: Marker) => state.setProgress(marker >= 1, Math.max(0, marker - 1)),
  };
}

/**
 * Setup always starts over. Collect a Conversation collects the next one, jumping Setup to its end
 * first if it isn't done, until `limit` are in. The last two steps are not built yet.
 */
export function extractButtons(limit: number): readonly StepButton[] {
  return [
    { key: "setup", label: "Setup", segmentToPlayWhenAt: () => ({ from: 0, to: 1 }) },
    {
      key: "collect",
      label: "Collect a Conversation",
      segmentToPlayWhenAt: marker => {
        const from = Math.max(marker, 1);
        return from - 1 < limit ? { from, to: from + 1 } : undefined;
      },
    },
    { key: "collect-all", label: "Collect All Conversations", segmentToPlayWhenAt: () => undefined },
    { key: "extract", label: "Extract Pathways", segmentToPlayWhenAt: () => undefined },
  ];
}
