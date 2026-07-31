import { mean, standardDeviation, pearson } from "./statistics";

describe("mean", () => {
  it("averages the values", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns NaN for an empty array", () => {
    expect(Number.isNaN(mean([]))).toBe(true);
  });
});

describe("standardDeviation", () => {
  it("computes the sample standard deviation", () => {
    // values 2,4,4,4,5,5,7,9 -> sample sd = 2.13809...
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });

  it("returns 0 when every value is identical", () => {
    expect(standardDeviation([3, 3, 3])).toBe(0);
  });

  it("returns NaN for fewer than two values", () => {
    expect(Number.isNaN(standardDeviation([1]))).toBe(true);
  });
});

describe("pearson", () => {
  it("returns 1 for a perfect positive relationship", () => {
    const result = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(result.r).toBeCloseTo(1, 10);
    expect(result.n).toBe(4);
  });

  it("returns -1 for a perfect negative relationship", () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2]).r).toBeCloseTo(-1, 10);
  });

  it("computes a known intermediate correlation", () => {
    // sxy = 8, sxx = syy = 10 -> r = 0.8
    const result = pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
    expect(result.r).toBeCloseTo(0.8, 10);
  });

  it("skips pairs where either value is null and reports the surviving n", () => {
    const result = pearson([1, 2, null, 4], [2, 4, 6, 8]);
    expect(result.r).toBeCloseTo(1, 10);
    expect(result.n).toBe(3);
  });

  it("skips pairs where the y value is null", () => {
    const result = pearson([1, 2, 3, 4], [2, null, 6, 8]);
    expect(result.n).toBe(3);
  });

  it("treats NaN and Infinity as missing", () => {
    const result = pearson([1, 2, NaN, Infinity, 5], [1, 2, 3, 4, 5]);
    expect(result.n).toBe(3);
  });

  it("returns null r when x has zero variance", () => {
    expect(pearson([2, 2, 2, 2], [1, 2, 3, 4]).r).toBeNull();
  });

  it("returns null r when y has zero variance", () => {
    expect(pearson([1, 2, 3, 4], [5, 5, 5, 5]).r).toBeNull();
  });

  it("returns null r with fewer than three complete pairs, still reporting n", () => {
    const result = pearson([1, 2, null], [1, 2, 3]);
    expect(result.r).toBeNull();
    expect(result.n).toBe(2);
  });

  it("gives the point-biserial correlation for a binary x", () => {
    // Binary against continuous — the same formula, which is why one function suffices.
    const result = pearson([0, 0, 1, 1], [1, 2, 3, 4]);
    expect(result.r).toBeCloseTo(0.894427, 5);
  });

  it("is symmetric in its arguments", () => {
    const a = pearson([1, 2, 3, 7], [2, 1, 4, 3]).r;
    const b = pearson([2, 1, 4, 3], [1, 2, 3, 7]).r;
    expect(a).toBeCloseTo(b as number, 12);
  });

  it("throws when the arrays have different lengths", () => {
    expect(() => pearson([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });
});
