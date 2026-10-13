import { StepTimeline } from "../../core/steps/step-player";
import { collectAllDuration, collectAllSceneAt } from "./collect-all-timeline";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { ExtractScene, pathwaysRestScene, restScene, stackRestScene } from "./extract-scene";
import { DECK_MARKER, PATHWAYS_MARKER } from "./extract-steps";
import { EXTRACT_MS, extractPathwaysSceneAt } from "./pathways-timeline";
import { setupDuration, setupSceneAt } from "./setup-timeline";

/**
 * Extract Pathways' timeline, for a deck of `deckSize` conversations. The segment to marker 1 is
 * Setup; from n to n + 1, below the deck, collects conversation n; and a segment to DECK_MARKER is
 * Collect All Conversations, from wherever it starts,
 * and the segment to PATHWAYS_MARKER is Extract Pathways, from the deck.
 */
export function extractTimeline(columnSizes: readonly number[], deckSize: number): StepTimeline<ExtractScene> {
  return {
    duration: ({ from, to }) => {
      if (to === 1) {
        return setupDuration(columnSizes);
      }
      if (to === PATHWAYS_MARKER) {
        return EXTRACT_MS;
      }
      if (to === DECK_MARKER) {
        return collectAllDuration(columnSizes, from - 1, deckSize);
      }
      return collectDuration(columnSizes, to - 1);
    },
    sceneAt: (marker, frame) => {
      if (!frame) {
        if (marker === PATHWAYS_MARKER) {
          return pathwaysRestScene(columnSizes, deckSize);
        }
        return marker === DECK_MARKER ? stackRestScene(columnSizes, deckSize) : restScene(columnSizes, marker);
      }
      if (frame.to === 1) {
        return setupSceneAt(columnSizes, frame.t);
      }
      if (frame.to === PATHWAYS_MARKER) {
        return extractPathwaysSceneAt(columnSizes, deckSize, frame.t);
      }
      if (frame.to === DECK_MARKER) {
        return collectAllSceneAt(columnSizes, frame.from - 1, deckSize, frame.t);
      }
      return collectSceneAt(columnSizes, frame.to - 1, frame.t);
    },
  };
}
