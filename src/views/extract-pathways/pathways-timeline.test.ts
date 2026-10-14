import { pathwaysRestScene } from "./extract-scene";
import { landedCounts, particlePlan, PARTICLES_MS } from "./particles";
import {
  COPY_FLY_MS, copyLeaves, EXTRACT_MS, extractPathwaysSceneAt, PATHWAY_MS, pathwayStart,
} from "./pathways-timeline";

const SIZES = [10, 8, 6, 2];
const at = (t: number) => extractPathwaysSceneAt(SIZES, 800, t);
const PARTICLES_AT = 1700;
const LINES_MS = 520;
/** When copy `neuron` of pathway 0 reaches its box. */
const arrival = (neuron: number) => pathwayStart(0) + copyLeaves(neuron) + COPY_FLY_MS;

describe("extractPathwaysSceneAt", () => {
  it("takes about 14 seconds, with the pathways a little over 2 seconds apart", () => {
    expect(EXTRACT_MS).toBe(14235);
    expect(PATHWAY_MS).toBe(2120);
    expect(pathwayStart(0)).toBe(PARTICLES_AT + PARTICLES_MS + 460);
  });

  it("slides the deck half off the canvas, and the lifted column after it", () => {
    expect(at(0).deck!.slide).toBe(0);
    expect(at(400).pathways!.slide).toBe(0);
    expect(at(1400).deck!.slide).toBe(1);
    expect(at(1500).pathways!.slide).toBe(1);
  });

  it("draws no bars until the particles start, then grows them as particles land", () => {
    expect(at(PARTICLES_AT - 1).pathways!.bars).toBeUndefined();
    const flying = at(PARTICLES_AT + 3000).pathways!;
    expect(flying.particles).toBe(3000);
    const grown = flying.bars!.map(bar => bar.grown);
    expect(Math.min(...grown)).toBeGreaterThan(0);
    expect(Math.max(...grown)).toBeLessThan(1);
    const { need } = particlePlan();
    const landed = landedCounts(3000);
    expect(flying.bars!.map((bar, b) => [b, bar.grown])).toEqual(need.map((n, b) => [b, Math.min(1, landed[b] / n)]));
    const built = at(PARTICLES_AT + PARTICLES_MS).pathways!;
    expect(built.particles).toBeUndefined();
    expect(built.bars!.every(bar => bar.grown === 1)).toBe(true);
  });

  it("builds each box from its pathway's bars, one pathway after another", () => {
    const first = pathwayStart(0);
    expect(at(first + 199).pathways!.flying).toBeUndefined();
    const lifting = at(first + 500).pathways!;
    expect(lifting.flying).toMatchObject({ pathway: 0 });
    expect(lifting.flying!.copies).toHaveLength(14);
    expect(at(first + 1500).pathways!.boxes.map(box => box.opacity)).toEqual([1, 0, 0]);
    expect(at(pathwayStart(1) + 1500).pathways!.boxes.map(box => box.opacity)).toEqual([1, 1, 0]);
  });

  it("sends a pathway's bar copies one after another, each fading from 82% of its flight", () => {
    const start = pathwayStart(0);
    const leaving = at(start + copyLeaves(13) - 1).pathways!.flying!.copies;
    expect(leaving[0].progress).toBeGreaterThan(0);
    expect(leaving[13].progress).toBe(0);
    const fades = start + copyLeaves(0) + Math.round(COPY_FLY_MS * 0.82);
    expect(at(fades).pathways!.flying!.copies[0].opacity).toBe(1);
    expect(at(fades + 50).pathways!.flying!.copies[0].opacity).toBeLessThan(1);
  });

  it("steps a box up a fourteenth as each bar copy lands", () => {
    for (let k = 0; k < 13; k++) {
      const opacity = at(arrival(k + 1) - 1).pathways!.boxes[0].opacity;
      expect([k, opacity > 0 && opacity <= (k + 1) / 14 + 1e-9]).toEqual([k, true]);
    }
    expect(at(arrival(13) + 140).pathways!.boxes[0].opacity).toBe(1);
  });

  it("kicks a box as each bar copy lands", () => {
    expect(at(arrival(0) + 10).pathways!.boxes[0].kick).toBeCloseTo(10 / 300);
    expect(at(arrival(1) + 5).pathways!.boxes[0].kick).toBeCloseTo(5 / 300);
  });

  it("grays a pathway's bars while their bar copies fly, and brings every bar's color back with the lines", () => {
    const lifting = at(pathwayStart(0) + 600).pathways!;
    // Bar 0 is neuron 0's bar for Pathway 1, and bar 1 its bar for Pathway 2.
    expect(lifting.bars![0].muted).toBe(1);
    expect(lifting.bars![1].muted).toBe(0);
    expect(lifting.lines).toBe(0);
    expect(at(EXTRACT_MS - LINES_MS - 1).pathways!.lines).toBe(0);
    expect(at(EXTRACT_MS - LINES_MS + 100).pathways!.lines).toBeGreaterThan(0);
    const ending = at(EXTRACT_MS - 1).pathways!;
    expect(ending.bars!.every(bar => bar.muted === 0)).toBe(true);
    expect(ending.lines).toBeGreaterThan(0.99);
  });

  it("ends on the pathways at rest", () => {
    expect(at(EXTRACT_MS)).toEqual(pathwaysRestScene(SIZES, 800));
  });
});
