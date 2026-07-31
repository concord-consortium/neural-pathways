import { mean, standardDeviation, pearson, compareGroups, linearFit } from "./statistics";

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

describe("compareGroups", () => {
  const groupValues = [0, 0, 0, 1, 1, 1];
  const scores = [1, 2, 3, 7, 8, 9];

  it("returns one group per distinct value, ascending", () => {
    const result = compareGroups(groupValues, scores);
    expect(result.groups.map(g => g.value)).toEqual([0, 1]);
  });

  it("computes each group's n and mean", () => {
    const result = compareGroups(groupValues, scores);
    expect(result.groups[0].n).toBe(3);
    expect(result.groups[0].mean).toBeCloseTo(2, 10);
    expect(result.groups[1].mean).toBeCloseTo(8, 10);
  });

  it("computes each group's sample standard deviation", () => {
    const result = compareGroups(groupValues, scores);
    expect(result.groups[0].sd).toBeCloseTo(1, 10);
  });

  it("computes separation in pooled standard deviations", () => {
    const result = compareGroups(groupValues, scores);
    // means differ by 6, pooled sd is 1 -> 6
    expect(result.separationSd).toBeCloseTo(6, 6);
  });

  it("shares bin edges across both groups", () => {
    const result = compareGroups(groupValues, scores, 4);
    expect(result.binEdges).toHaveLength(5);
    expect(result.binEdges[0]).toBeCloseTo(1, 10);
    expect(result.binEdges[4]).toBeCloseTo(9, 10);
    for (const group of result.groups) {
      expect(group.counts).toHaveLength(4);
    }
  });

  it("counts every observation exactly once across the bins", () => {
    const result = compareGroups(groupValues, scores, 4);
    const total = result.groups.reduce(
      (sum, g) => sum + g.counts.reduce((a, b) => a + b, 0), 0,
    );
    expect(total).toBe(6);
  });

  it("skips pairs where either value is null", () => {
    const result = compareGroups([0, null, 1, 1], [1, 2, 3, null]);
    expect(result.groups.map(g => g.n)).toEqual([1, 1]);
  });

  it("returns null separation when there are not exactly two groups", () => {
    expect(compareGroups([0, 0, 0], [1, 2, 3]).separationSd).toBeNull();
    expect(compareGroups([0, 1, 2], [1, 2, 3]).separationSd).toBeNull();
  });

  it("returns null separation when pooled sd is zero", () => {
    const result = compareGroups([0, 0, 1, 1], [5, 5, 9, 9]);
    expect(result.separationSd).toBeNull();
  });

  it("handles all scores being identical without dividing by a zero range", () => {
    const result = compareGroups([0, 0, 1, 1], [3, 3, 3, 3]);
    const total = result.groups.reduce(
      (sum, g) => sum + g.counts.reduce((a, b) => a + b, 0), 0,
    );
    expect(total).toBe(4);
  });

  it("returns no groups for empty input", () => {
    const result = compareGroups([], []);
    expect(result.groups).toEqual([]);
    expect(result.separationSd).toBeNull();
  });
});

describe("linearFit", () => {
  it("recovers the slope and intercept of an exact line", () => {
    const fit = linearFit([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(fit).not.toBeNull();
    expect((fit as { slope: number }).slope).toBeCloseTo(2, 10);
    expect((fit as { intercept: number }).intercept).toBeCloseTo(1, 10);
  });

  it("handles a negative slope", () => {
    const fit = linearFit([1, 2, 3, 4], [9, 7, 5, 3]);
    expect((fit as { slope: number }).slope).toBeCloseTo(-2, 10);
  });

  it("skips pairs where either value is null", () => {
    const fit = linearFit([1, 2, null, 4], [3, 5, 100, 9]);
    expect((fit as { slope: number }).slope).toBeCloseTo(2, 10);
  });

  it("returns null when x has zero variance", () => {
    expect(linearFit([2, 2, 2], [1, 2, 3])).toBeNull();
  });

  it("returns null with fewer than two complete pairs", () => {
    expect(linearFit([1, null], [1, 2])).toBeNull();
  });

  it("throws when the arrays have different lengths", () => {
    expect(() => linearFit([1, 2], [1, 2, 3])).toThrow(/length mismatch/);
  });
});
