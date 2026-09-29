import { emptyScene, fullScene } from "../../core/network-diagram/scene";
import { sceneAt, stepDuration, unitDuration } from "./step-timeline";

const SIZES = [10, 8, 6, 2];

describe("unitDuration", () => {
  it("shortens each unit of a fan, down to 150 ms", () => {
    expect(unitDuration(0)).toBe(900);
    expect(unitDuration(1)).toBeCloseTo(684);
    expect(unitDuration(2)).toBeCloseTo(519.84);
    expect(unitDuration(7)).toBe(150);
  });
});

describe("stepDuration", () => {
  it("matches the prototype's Med speed", () => {
    expect(stepDuration(1, SIZES)).toBe(675);
    expect(stepDuration(2, SIZES)).toBeCloseTo(3830.805, 2);
    expect(stepDuration(3, SIZES)).toBeCloseTo(3530.805, 2);
    expect(stepDuration(4, SIZES)).toBeCloseTo(3547.375, 2);
  });
});

describe("sceneAt", () => {
  it("draws nothing before the first step", () => {
    expect(sceneAt(SIZES, 0)).toEqual(emptyScene(SIZES));
  });

  it("draws everything after the last step", () => {
    expect(sceneAt(SIZES, 4)).toEqual(fullScene(SIZES));
  });

  it("fills the inputs one by one, top to bottom, in Step 1", () => {
    expect(sceneAt(SIZES, 0, { step: 1, t: 0 }).nodeFill[0].every(x => x === 0)).toBe(true);
    const fill = sceneAt(SIZES, 0, { step: 1, t: 200 }).nodeFill[0];
    expect(fill[0]).toBe(1);
    expect(fill[1]).toBeGreaterThan(0);
    expect(fill[1]).toBeLessThan(1);
    expect(fill[9]).toBe(0);
    expect(sceneAt(SIZES, 0, { step: 1, t: 675 }).nodeFill[0].every(x => x === 1)).toBe(true);
  });

  it("draws a running step over the steps already done", () => {
    const scene = sceneAt(SIZES, 1, { step: 2, t: 0 });
    expect(scene.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(scene.edgeDraw[0].every(x => x === 0)).toBe(true);
    expect(scene.nodeFill[1].every(x => x === 0)).toBe(true);
  });

  it("plays a fan one source unit at a time", () => {
    // Step 3's fan runs from Hidden 1's 8 units; unit 2 runs from 1584 to 2103.84 ms.
    const scene = sceneAt(SIZES, 2, { step: 3, t: 1843.92 });
    expect(scene.edgeDraw[0].every(x => x === 1)).toBe(true);
    expect(scene.edgeDraw[1][0]).toBe(1);
    expect(scene.edgeDraw[1][1]).toBe(1);
    expect(scene.edgeDraw[1][2]).toBeCloseTo(0.5, 3);
    expect(scene.edgeDraw[1].slice(3).every(x => x === 0)).toBe(true);
    expect(scene.edgeDraw[2].every(x => x === 0)).toBe(true);
    expect(scene.nodeFill[2].every(x => Math.abs(x - 2 / 8) < 1e-9)).toBe(true);
    expect(scene.weightLabel).toEqual([true, true, false]);
  });

  it("raises the target gauges a unit's share as each unit lands", () => {
    // Step 2: unit 0 ends at 900 ms and its share eases in over 180 ms.
    expect(sceneAt(SIZES, 1, { step: 2, t: 900 }).nodeFill[1][0]).toBe(0);
    expect(sceneAt(SIZES, 1, { step: 2, t: 990 }).nodeFill[1][0]).toBeGreaterThan(0);
    expect(sceneAt(SIZES, 1, { step: 2, t: 1080 }).nodeFill[1][0]).toBeCloseTo(0.1);
  });

  it("shows a gap's weight caption halfway through its first unit", () => {
    expect(sceneAt(SIZES, 1, { step: 2, t: 449 }).weightLabel[0]).toBe(false);
    expect(sceneAt(SIZES, 1, { step: 2, t: 450 }).weightLabel[0]).toBe(true);
  });

  it("reveals the answer at the end of Step 4", () => {
    const fanEnd = stepDuration(4, SIZES) - 520;
    expect(sceneAt(SIZES, 3, { step: 4, t: fanEnd + 60 }).answer).toBe(0);
    const midway = sceneAt(SIZES, 3, { step: 4, t: fanEnd + 290 }).answer;
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    expect(sceneAt(SIZES, 3, { step: 4, t: stepDuration(4, SIZES) }).answer).toBe(1);
  });

  it("leaves the answer hidden in the earlier steps", () => {
    expect(sceneAt(SIZES, 3).answer).toBe(0);
  });
});
