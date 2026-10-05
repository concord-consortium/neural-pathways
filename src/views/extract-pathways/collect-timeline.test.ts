import { restScene } from "./extract-scene";
import { collectDuration, collectSceneAt, collectVersion } from "./collect-timeline";

const SIZES = [10, 8, 6, 2];
/** A collection after the first starts by bringing the dimmed network back over this long. */
const UNDIM = 320;
/** Swap: the network is blank 504 ms after the undim and refilled by 3,024. Quick swap: done at 456. */
const BLANK = UNDIM + 504;
const QUICK_DONE = UNDIM + 456;

describe("collectVersion", () => {
  it("replays the steps for the first conversation, swaps the next two, then takes the quick swap", () => {
    expect([1, 2, 3, 4, 10].map(collectVersion)).toEqual(["replay", "swap", "swap", "quick", "quick"]);
  });
});

describe("collectDuration", () => {
  it("adds the undim, the hold and the flight to each version's network part", () => {
    expect(collectDuration(SIZES, 1)).toBeCloseTo(7907.34, 1);
    expect(collectDuration(SIZES, 2)).toBe(6670);
    expect(collectDuration(SIZES, 4)).toBe(4042);
  });
});

describe("collectSceneAt", () => {
  it.each([1, 2, 3, 4, 10])("ends conversation %p on the scene at rest with it collected", n => {
    expect(collectSceneAt(SIZES, n, collectDuration(SIZES, n))).toEqual(restScene(SIZES, n + 1));
  });

  it("starts the replay with the label bouncing in over a blank network at full strength", () => {
    const scene = collectSceneAt(SIZES, 1, 260);
    expect(scene.shown).toBe(1);
    expect(scene.label?.n).toBe(1);
    expect(scene.label?.bounce).toBeCloseTo(0.5);
    expect(scene.network.nodeFill[0].every(x => x === 0)).toBe(true);
    expect(scene.network.dim).toBe(1);
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

  it("brings back the network and the lifted column the last flight dimmed, before a later conversation", () => {
    const start = collectSceneAt(SIZES, 2, 0);
    expect(start.network.dim).toBe(0.5);
    expect(start.lifted?.opacity).toBe(0.5);
    expect(start.shown).toBe(1);
    const partway = collectSceneAt(SIZES, 2, UNDIM / 2).network.dim;
    expect(partway).toBeGreaterThan(0.5);
    expect(partway).toBeLessThan(1);
    const undimmed = collectSceneAt(SIZES, 2, UNDIM);
    expect(undimmed.network.dim).toBe(1);
    expect(undimmed.lifted?.opacity).toBe(1);
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
    expect(collectSceneAt(SIZES, 2, UNDIM - 1).network.nodeFill[0][0]).toBe(1);
    const scene = collectSceneAt(SIZES, 2, UNDIM + 110);
    expect(scene.network.nodeFill[0].every(x => x === 0)).toBe(true);
    expect(scene.network.nodeFill[1][0]).toBe(1);
    expect(scene.network.edgeDraw[0].every(x => x === 1)).toBe(true);
    expect(collectSceneAt(SIZES, 2, UNDIM + 128).network.edgeDraw[0].every(x => x === 0)).toBe(true);
  });

  it("swaps: refills a layer, then sweeps all its lines in together", () => {
    const refill = BLANK + 420;
    expect(collectSceneAt(SIZES, 2, refill).network.nodeFill[0][0]).toBe(1);
    expect(collectSceneAt(SIZES, 2, refill).network.nodeFill[0][1]).toBe(0);
    const sweepStart = refill + 9 * 30 + 30;
    const sweep = collectSceneAt(SIZES, 2, sweepStart + 180).network.edgeDraw[0];
    expect(sweep.every(x => Math.abs(x - 0.5) < 1e-9)).toBe(true);
  });

  it("takes the quick swap once the network is back, with a shorter bounce", () => {
    const waiting = collectSceneAt(SIZES, 4, UNDIM - 1);
    expect(waiting.shown).toBe(3);
    expect(waiting.label).toEqual({ n: 3, bounce: 1 });
    expect(waiting.network.nodeFill.every(column => column.every(x => x === 1))).toBe(true);
    const scene = collectSceneAt(SIZES, 4, UNDIM);
    expect(scene.shown).toBe(4);
    expect(scene.label).toEqual({ n: 4, bounce: 0 });
    expect(collectSceneAt(SIZES, 4, UNDIM + 182).label?.bounce).toBeCloseTo(0.5);
    expect(collectSceneAt(SIZES, 4, QUICK_DONE).network.answer).toBe(1);
  });

  it("dims all but the hidden neurons, and the lifted column, for the flight, and leaves them dimmed", () => {
    const flightStart = QUICK_DONE + 550;
    expect(collectSceneAt(SIZES, 4, flightStart).network.dim).toBe(1);
    expect(collectSceneAt(SIZES, 4, flightStart + 350).network.dim).toBe(0.5);
    expect(collectSceneAt(SIZES, 4, flightStart + 350).lifted?.opacity).toBe(0.5);
    expect(collectSceneAt(SIZES, 4, flightStart + 549).deck).toHaveLength(3);
    const flying = collectSceneAt(SIZES, 4, flightStart + 1000).deck;
    expect(flying).toHaveLength(4);
    expect(flying[3]).toEqual({ conversation: 4, flight: 450 });
    const end = collectSceneAt(SIZES, 4, collectDuration(SIZES, 4));
    expect(end.network.dim).toBe(0.5);
    expect(end.lifted?.opacity).toBe(0.5);
  });
});
