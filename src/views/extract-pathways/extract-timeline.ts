import { StepTimeline } from "../../core/steps/step-player";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { ExtractScene, restScene } from "./extract-scene";
import { setupDuration, setupSceneAt } from "./setup-timeline";

/** Extract Pathways' timeline: the segment to marker 1 is Setup; from n to n + 1 collects conversation n. */
export function extractTimeline(columnSizes: readonly number[]): StepTimeline<ExtractScene> {
  return {
    duration: ({ to }) => (to === 1 ? setupDuration(columnSizes) : collectDuration(columnSizes, to - 1)),
    sceneAt: (marker, run) => {
      if (!run) {
        return restScene(columnSizes, marker);
      }
      return run.to === 1 ? setupSceneAt(columnSizes, run.t) : collectSceneAt(columnSizes, run.to - 1, run.t);
    },
  };
}
