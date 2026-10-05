import { restScene } from "./extract-scene";
import { collectDuration, collectSceneAt, collectVersion } from "./collect-timeline";

const SIZES = [10, 8, 6, 2];
/** Swap: the network is blank at 504 ms and refilled by 3,024. Quick swap: done at 456. */
const BLANK = 504;

describe("collectVersion", () => {
  it("replays the steps for the first conversation, swaps the next two, then takes the quick swap", () => {
    expect([1, 2, 3, 4, 10].map(collectVersion)).toEqual(["replay", "swap", "swap", "quick", "quick"]);
  });
});

describe("collectDuration", () => {
  it("adds the hold and the flight to each version's network part", () => {
    expect(collectDuration(SIZES, 1)).toBeCloseTo(8227.34, 1);
    expect(collectDuration(SIZES, 2)).toBe(6670);
    expect(collectDuration(SIZES, 4)).toBe(4042);
  });
});

describe("collectSceneAt", () => {
  it.each([1, 2, 3, 4, 10])("ends conversation %p on the scene at rest with it collected", n => {
    expect(collectSceneAt(SIZES, n, collectDuration(SIZES, n))).toEqual(restScene(SIZES, n + 1));
  });

  it("starts the replay with the label bouncing in over a blank network", () => {
    const scene = collectSceneAt(SIZES, 1, 260);
    expect(scene.shown).toBe(1);
    expect(scene.label?.n).toBe(1);
    expect(scene.label?.bounce).toBeCloseTo(0.5);
    expect(scene.network.nodeFill[0].every(x => x === 0)).toBe(true);
  });

  it("fills the inputs at their normal speed, from 540 ms", () => {
    expect(collectSceneAt(SIZES, 1, 540 + 675).network.nodeFill[0].every(x => x === 1)).toBe(true);
    expect(collectSceneAt(SIZES, 1, 540 + 200).network.nodeFill[0][9]).toBe(0);
  });

  it("plays the fans at 0.26 of their normal speed", () => {
    const step2Start = 540 + 675 + 110;
    const scene = collectSceneAt(SIZES, 1, step2Start + 900 * 0.26);
    expect(scene.network.edgeDraw[0][0]).toBe(1);
    expect(scene.network.edgeDraw[0][1]).toBeLessThan(1);
  });

  it("swaps: shows the old conversation until the network is blank, then the new one", () => {
    const before = collectSceneAt(SIZES, 2, BLANK - 1);
    expect(before.shown).toBe(1);
    expect(before.label).toEqual({ n: 1, bounce: 1 });
    expect(before.network.answer).toBe(1);
    const blank = collectSceneAt(SIZES, 2, BLANK);
    expect(blank.shown).toBe(2);
    expect(blank.label).toEqual({ n: 2, bounce: 0 });
    expect(blank.network.answer).toBe(0);
    expect(blank.network.nodeFill.every(column => column.every(x => x === 0))).toBe(true);
    expect(blank.network.edgeDraw.every(gap => gap.every(x => x === 0))).toBe(true);
  });

  it("swaps: drains a layer at a time, its lines clearing after its last gauge", () => {
    const scene = collectSceneAt(SIZES, 2, 110);
    expect(scene.network.nodeFill[0].every(x => x === 0)).toBe(true);
    expect(scene.network.nodeFill[1][0]).toBe(1);
    expect(scene.network.edgeDraw[0].every(x => x === 1)).toBe(true);
    expect(collectSceneAt(SIZES, 2, 128).network.edgeDraw[0].every(x => x === 0)).toBe(true);
  });

  it("swaps: refills a layer, then sweeps all its lines in together", () => {
    const refill = BLANK + 420;
    expect(collectSceneAt(SIZES, 2, refill).network.nodeFill[0][0]).toBe(1);
    expect(collectSceneAt(SIZES, 2, refill).network.nodeFill[0][1]).toBe(0);
    const sweepStart = refill + 9 * 30 + 30;
    const sweep = collectSceneAt(SIZES, 2, sweepStart + 180).network.edgeDraw[0];
    expect(sweep.every(x => Math.abs(x - 0.5) < 1e-9)).toBe(true);
  });

  it("takes the quick swap at once, with a shorter bounce", () => {
    const scene = collectSceneAt(SIZES, 4, 0);
    expect(scene.shown).toBe(4);
    expect(scene.label).toEqual({ n: 4, bounce: 0 });
    expect(collectSceneAt(SIZES, 4, 182).label?.bounce).toBeCloseTo(0.5);
    expect(collectSceneAt(SIZES, 4, 456).network.answer).toBe(1);
  });

  it("dims the network and the lifted column before the flight, and flies the new column", () => {
    const flightStart = 456 + 550;
    expect(collectSceneAt(SIZES, 4, flightStart + 350).network.dim).toEqual({ rest: 0.5, hidden: 0.5 });
    expect(collectSceneAt(SIZES, 4, flightStart + 350).lifted?.opacity).toBe(0.5);
    expect(collectSceneAt(SIZES, 4, flightStart + 549).deck).toHaveLength(3);
    const flying = collectSceneAt(SIZES, 4, flightStart + 1000).deck;
    expect(flying).toHaveLength(4);
    expect(flying[3]).toEqual({ conversation: 4, flight: 450 });
  });
});
