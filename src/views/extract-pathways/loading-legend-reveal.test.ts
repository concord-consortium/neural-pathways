import { clamp01 } from "../../core/network-diagram/easing";
import { finishedPathways, restScene } from "./extract-scene";
import { loadingLegendReveal } from "./loading-legend-reveal";

const COLUMN_SIZES = [10, 8, 6, 2];
const LOADINGS = [[0.5, -0.5, 0.25]];

function sceneWithLines(lines: number, done = false) {
  const scene = restScene(COLUMN_SIZES, 1);
  scene.pathways = { ...finishedPathways(LOADINGS), lines, done };
  return scene;
}

describe("loadingLegendReveal", () => {
  it("is undefined while there are no pathways", () => {
    expect(loadingLegendReveal(restScene(COLUMN_SIZES, 1))).toBeUndefined();
  });

  it("is undefined until the lines start to draw", () => {
    expect(loadingLegendReveal(sceneWithLines(0))).toBeUndefined();
  });

  it("widens with the lines and fades in a little later", () => {
    const reveal = loadingLegendReveal(sceneWithLines(0.5));
    expect(reveal!.width).toBe(0.5);
    expect(reveal!.opacity).toBeCloseTo(clamp01(0.15 / 0.7), 10);
  });

  it("is fully shown once the pathways are done", () => {
    expect(loadingLegendReveal(sceneWithLines(0.5, true))).toEqual({ width: 1, opacity: 1 });
  });
});
