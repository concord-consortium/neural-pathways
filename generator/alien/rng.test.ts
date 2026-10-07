import { createRng } from "./rng";

describe("createRng", () => {
  it("is reproducible from the seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const first = [a.next(), a.next(), a.next()];
    const second = [b.next(), b.next(), b.next()];
    expect(first).toEqual(second);
  });

  it("gives different streams for different seeds", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("stays inside [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces a standard normal", () => {
    const rng = createRng(11);
    const values: number[] = [];
    for (let i = 0; i < 50000; i++) values.push(rng.normal());
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
  });

  it("covers both endpoints of int()", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(rng.int(2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it("respects weights", () => {
    const rng = createRng(5);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[rng.weightedIndex([1, 3, 0])]++;
    expect(counts[2]).toBe(0);
    expect(counts[1] / counts[0]).toBeGreaterThan(2.7);
    expect(counts[1] / counts[0]).toBeLessThan(3.3);
  });

  it("can pick any element from the array", () => {
    const rng = createRng(13);
    const items = ["a", "b", "c", "d"];
    const picked = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const result = rng.pick(items);
      picked.add(result);
      expect(items).toContain(result);
    }
    // With seed 13 over 1000 draws, we should see both first and last elements
    expect(picked).toContain("a");
    expect(picked).toContain("d");
  });

  it("throws when weightedIndex gets all-zero weights", () => {
    const rng = createRng(4);
    expect(() => rng.weightedIndex([0, 0])).toThrow(
      "weightedIndex: weights must include at least one positive value"
    );
  });

  it("throws when weightedIndex gets empty weights", () => {
    const rng = createRng(6);
    expect(() => rng.weightedIndex([])).toThrow(
      "weightedIndex: weights must include at least one positive value"
    );
  });
});
