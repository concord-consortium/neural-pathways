import { collectAllDuration, collectAllSceneAt } from "./collect-all-timeline";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import { pathwaysRestScene, restScene, stackRestScene } from "./extract-scene";
import { extractTimeline } from "./extract-timeline";
import { EXTRACT_MS, extractPathwaysSceneAt } from "./pathways-timeline";
import { setupDuration, setupSceneAt } from "./setup-timeline";

const SIZES = [10, 8, 6, 2];
const timeline = extractTimeline(SIZES, 20);

describe("extractTimeline", () => {
  it("times the segment to 1 as Setup, and the segment to n + 1 as collecting conversation n", () => {
    expect(timeline.duration({ from: 0, to: 1 })).toBe(setupDuration(SIZES));
    expect(timeline.duration({ from: 1, to: 2 })).toBe(collectDuration(SIZES, 1));
    expect(timeline.duration({ from: 4, to: 5 })).toBe(collectDuration(SIZES, 4));
  });

  it("draws the scene at rest when nothing runs", () => {
    expect(timeline.sceneAt(3)).toEqual(restScene(SIZES, 3));
  });

  it("draws a frame of the run playing from Setup's or the collection's timeline", () => {
    expect(timeline.sceneAt(0, { button: "setup", from: 0, to: 1, t: 900 })).toEqual(setupSceneAt(SIZES, 900));
    expect(timeline.sceneAt(2, { button: "collect", from: 2, to: 3, t: 900 })).toEqual(collectSceneAt(SIZES, 2, 900));
  });

  it("times a segment to the deck as Collect All, from where it starts", () => {
    expect(timeline.duration({ from: 1, to: 12 })).toBe(collectAllDuration(SIZES, 0, 20));
    expect(timeline.duration({ from: 5, to: 12 })).toBe(collectAllDuration(SIZES, 4, 20));
  });

  it("rests on the finished deck at the deck's marker", () => {
    expect(timeline.sceneAt(12)).toEqual(stackRestScene(SIZES, 20));
  });

  it("draws a frame of Collect All from Collect All's timeline", () => {
    expect(timeline.sceneAt(4, { button: "collect-all", from: 4, to: 12, t: 900 }))
      .toEqual(collectAllSceneAt(SIZES, 3, 20, 900));
  });

  it("times, rests and draws the segment to the pathways as Extract Pathways", () => {
    expect(timeline.duration({ from: 12, to: 13 })).toBe(EXTRACT_MS);
    expect(timeline.sceneAt(13)).toEqual(pathwaysRestScene(SIZES, 20));
    expect(timeline.sceneAt(12, { button: "extract", from: 12, to: 13, t: 3000 }))
      .toEqual(extractPathwaysSceneAt(SIZES, 20, 3000));
  });
});
