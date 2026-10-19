import { StepTimeline } from "../../core/steps/step-player";
import { collectAllDuration, collectAllSceneAt } from "./collect-all-timeline";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { deckRestScene, ExtractScene, restScene } from "./extract-scene";
import { DECK_MARKER } from "./extract-steps";
import { setupDuration, setupSceneAt } from "./setup-timeline";

/**
 * Extract Pathways' timeline, for a deck of `deckSize` conversations. The segment to marker 1 is
 * Setup; from n to n + 1, below DECK_MARKER, collects conversation n; and a segment to DECK_MARKER
 * is Collect All, from wherever it starts. At rest at or past DECK_MARKER, it shows the finished
 * deck, since drawing the pathways isn't built yet.
 */
export function extractTimeline(columnSizes: readonly number[], deckSize: number): StepTimeline<ExtractScene> {
  return {
    duration: ({ from, to }) => {
      if (to === 1) {
        return setupDuration(columnSizes);
      }
      if (to === DECK_MARKER) {
        return collectAllDuration(columnSizes, from - 1, deckSize);
      }
      return collectDuration(columnSizes, to - 1);
    },
    sceneAt: (marker, frame) => {
      if (!frame) {
        return marker >= DECK_MARKER ? deckRestScene(columnSizes, deckSize) : restScene(columnSizes, marker);
      }
      if (frame.to === 1) {
        return setupSceneAt(columnSizes, frame.t);
      }
      if (frame.to === DECK_MARKER) {
        return collectAllSceneAt(columnSizes, frame.from - 1, deckSize, frame.t);
      }
      return collectSceneAt(columnSizes, frame.to - 1, frame.t);
    },
  };
}
