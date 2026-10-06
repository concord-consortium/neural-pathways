import { collectDuration, collectSceneAt } from "./collect-timeline";
import { restScene } from "./extract-scene";
import { extractTimeline } from "./extract-timeline";
import { setupDuration, setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];
const timeline = extractTimeline(SIZES);

describe("extractTimeline", () => {
  it("times a run to 1 as Setup, and a run to n + 1 as collecting conversation n", () => {
    expect(timeline.duration({ from: 0, to: 1 })).toBe(setupDuration(SIZES));
    expect(timeline.duration({ from: 1, to: 2 })).toBe(collectDuration(SIZES, 1));
    expect(timeline.duration({ from: 4, to: 5 })).toBe(collectDuration(SIZES, 4));
  });

  it("draws the scene at rest when nothing runs", () => {
    expect(timeline.sceneAt(3)).toEqual(restScene(SIZES, 3));
  });

  it("draws the run's timeline when one runs", () => {
    expect(timeline.sceneAt(0, { button: "setup", from: 0, to: 1, t: 900 })).toEqual(setupSceneAt(SIZES, 900));
    expect(timeline.sceneAt(2, { button: "collect", from: 2, to: 3, t: 900 })).toEqual(collectSceneAt(SIZES, 2, 900));
  });
});
