import { StepTimeline } from "../../core/steps/step-player";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { ExtractScene, restScene } from "./extract-scene";
import { setupDuration, setupSceneAt } from "./setup-timeline";

/** Extract Pathways' steps: a run to 1 is Setup; a run from n to n + 1 collects conversation n. */
export function extractTimeline(columnSizes: readonly number[]): StepTimeline<ExtractScene> {
  return {
    duration: (_from, to) => (to === 1 ? setupDuration(columnSizes) : collectDuration(columnSizes, to - 1)),
    sceneAt: (done, run) => {
      if (!run) {
        return restScene(columnSizes, done);
      }
      return run.to === 1 ? setupSceneAt(columnSizes, run.t) : collectSceneAt(columnSizes, run.to - 1, run.t);
    },
  };
}
