import { fixtureLoadings } from "../../core/network/__fixtures__/alien3-network";
import { pathwaysRestScene } from "./extract-scene";
import { PARTICLES_MS } from "./particles";
import { EXTRACT_MS, extractPathwaysSceneAt, PATHWAY_MS, pathwayStart } from "./pathways-timeline";

const SIZES = [10, 8, 6, 2];
const at = (t: number) => extractPathwaysSceneAt(SIZES, 800, fixtureLoadings, t);
const PARTICLES_AT = 1700;

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

  it("kicks a box as each copy lands", () => {
    const landing = pathwayStart(0) + 200 + 760;
    expect(at(landing + 10).pathways!.boxes[0].kick).toBeCloseTo(10 / 300);
  });

  it("grays a pathway's bars while their copies fly, and brings every bar's color back with the lines", () => {
    const lifting = at(pathwayStart(0) + 600).pathways!;
    // Bar 0 is neuron 1's pathway 1, and bar 1 its pathway 2.
    expect(lifting.bars![0].muted).toBe(1);
    expect(lifting.bars![1].muted).toBe(0);
    expect(lifting.lines).toBe(0);
    const ending = at(EXTRACT_MS - 1).pathways!;
    expect(ending.bars!.every(bar => bar.muted === 0)).toBe(true);
    expect(ending.lines).toBeGreaterThan(0.99);
  });

  it("ends on the pathways at rest", () => {
    expect(at(EXTRACT_MS)).toEqual(pathwaysRestScene(SIZES, 800, fixtureLoadings));
  });
});
