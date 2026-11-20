import { chipsAt, inputFillAt, landingTime, passDuration, passStart, step1Duration } from "./word-flights";

describe("Step 1's timing", () => {
  it("gives each input a pass that shortens to a floor", () => {
    expect([0, 1, 2, 6, 9].map(passDuration)).toEqual([1400, 980, 686, 170, 170]);
    expect(passDuration(5)).toBeCloseTo(235.298, 3);
    expect(passStart(0)).toBe(0);
    expect(passStart(2)).toBe(2380);
  });
  it("ends 180 ms after the last pass, whatever the word count", () => {
    expect(step1Duration(10)).toBeCloseTo(4977.638, 3);
  });
  it("lands the nearest copy at 70% of the pass and the farthest at its end", () => {
    expect(landingTime(0, 0, 5)).toBeCloseTo(980);
    expect(landingTime(0, 4, 5)).toBeCloseTo(1400);
    expect(landingTime(1, 0, 5)).toBeCloseTo(1400 + 686);
  });
  it("lands a one-word message's only copy at the end of each pass", () => {
    expect(landingTime(0, 0, 1)).toBe(1400);
    expect(landingTime(2, 0, 1)).toBeCloseTo(passStart(2) + 686);
  });
  it("fills each input a share per landing, eased, and exactly to 1 once the last has eased in", () => {
    expect(inputFillAt(0, 10, 4)).toEqual(new Array(10).fill(0));
    // Two words land at 980 and 1400 ms, so at 1160 the first has eased in and the second hasn't begun.
    expect(inputFillAt(landingTime(0, 0, 2) + 180, 10, 2)[0]).toBeCloseTo(0.5);
    expect(inputFillAt(step1Duration(10), 10, 4)).toEqual(new Array(10).fill(1));
    expect(inputFillAt(step1Duration(10), 10, 1)).toEqual(new Array(10).fill(1));
  });
});

describe("chipsAt", () => {
  const words = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  const inputs = [{ x: 300, y: 200 }, { x: 300, y: 230 }];
  it("starts every copy of a pass on its word at the pass's start", () => {
    const chips = chipsAt(0, words, inputs);
    expect(chips.map(c => [c.word, c.unit, c.x, c.y, c.opacity, c.scale]))
      .toEqual(expect.arrayContaining([[0, 0, 0, 0, 1, 1], [1, 0, 100, 0, 1, 1]]));
    expect(chips).toHaveLength(2);
  });
  it("orders a pass's copies nearest first, so the farther word lands last", () => {
    // Word 1 is nearer input 0 (283 px against 361), so its copy lands first and word 0's is
    // still flying.
    const nearLands = landingTime(0, 0, 2);
    expect(chipsAt(nearLands, words, inputs).map(c => c.word)).toEqual([0]);
  });
  it("fades a copy only after 86% of its flight", () => {
    const land = landingTime(0, 1, 2);
    expect(chipsAt(land * 0.85, words, inputs).find(c => c.word === 0)!.opacity).toBe(1);
    const late = chipsAt(land * 0.95, words, inputs).find(c => c.word === 0)!;
    expect(late.opacity).toBeLessThan(1);
    expect(late.scale).toBeGreaterThan(0.12);
  });
  it("has nothing in flight once Step 1 is over", () => {
    expect(chipsAt(step1Duration(2), words, inputs)).toEqual([]);
  });
});
