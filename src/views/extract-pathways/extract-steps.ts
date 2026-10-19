import { StepButton } from "../../core/steps/step-button";
import { Marker, StepProgress } from "../../core/steps/step-player";
import { ExtractPathwaysState } from "./extract-pathways-state";

/** The most conversations Collect a Conversation gathers one at a time, as in the prototype. */
export const MAX_COLLECTED = 10;
/** Where the timeline rests once Collect All Conversations has built the deck. */
export const DECK_MARKER = MAX_COLLECTED + 2;
/** Where it rests once Extract Pathways has drawn the pathways. */
export const PATHWAYS_MARKER = DECK_MARKER + 1;

/**
 * The marker, from the stages stored in the state: 0 at the start, 1 once Setup is done, one more
 * for each conversation collected by hand, then DECK_MARKER and PATHWAYS_MARKER. A stage stored
 * without the ones before it reads as the latest it can, but nothing reads past Setup undone.
 * `limit` is how many can be collected by hand; a stored count above it reads as the limit.
 * `deckSize` is the count stored once the deck is done.
 */
export function extractProgress(state: ExtractPathwaysState, limit: number, deckSize: number): StepProgress {
  return {
    get marker() {
      if (!state.setupDone) {
        return 0;
      }
      if (state.pathwaysDone) {
        return PATHWAYS_MARKER;
      }
      if (state.deckDone) {
        return DECK_MARKER;
      }
      return 1 + Math.min(state.collected, limit);
    },
    setMarker: (marker: Marker) => state.setProgress({
      setupDone: marker >= 1,
      collected: marker >= DECK_MARKER ? deckSize : Math.max(0, marker - 1),
      deckDone: marker >= DECK_MARKER,
      pathwaysDone: marker >= PATHWAYS_MARKER,
    }),
  };
}

/**
 * Setup always starts over. Collect a Conversation collects the next one, jumping Setup to its end
 * first if it isn't done, until `limit` are in; from the deck or the pathways it starts the
 * collecting over. Collect All Conversations builds the deck from wherever the collecting stopped;
 * from the deck or the pathways, it starts the collecting over, as Collect a Conversation does. Extract Pathways is
 * not built yet.
 */
export function extractButtons(limit: number): readonly StepButton[] {
  return [
    { key: "setup", label: "Setup", segmentToPlayWhenAt: () => ({ from: 0, to: 1 }) },
    {
      key: "collect",
      label: "Collect a Conversation",
      segmentToPlayWhenAt: marker => {
        if (marker >= DECK_MARKER) {
          return { from: 1, to: 2 };
        }
        const from = Math.max(marker, 1);
        return from - 1 < limit ? { from, to: from + 1 } : undefined;
      },
    },
    {
      key: "collect-all",
      label: "Collect All Conversations",
      segmentToPlayWhenAt: marker => ({ from: marker >= DECK_MARKER ? 1 : Math.max(marker, 1), to: DECK_MARKER }),
    },
    { key: "extract", label: "Extract Pathways", segmentToPlayWhenAt: () => undefined },
  ];
}
