import {
  mean, standardDeviation, pearson, compareGroups, linearFit, chooseBins, summarize, BinPlan,
} from "./statistics";

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
  // Each score appears twice, so the six distinct values are genuinely repeated
  // and the column reads as discrete rather than as a narrow sample.
  const groupValues = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
  const scores = [1, 1, 2, 2, 3, 3, 7, 7, 8, 8, 9, 9];

  it("returns one group per distinct value, ascending", () => {
    const result = compareGroups(groupValues, scores);
    expect(result.groups.map(g => g.value)).toEqual([0, 1]);
  });

  it("computes each group's n and mean", () => {
    const result = compareGroups(groupValues, scores);
    expect(result.groups[0].n).toBe(6);
    expect(result.groups[0].mean).toBeCloseTo(2, 10);
    expect(result.groups[1].mean).toBeCloseTo(8, 10);
  });

  it("computes each group's sample standard deviation", () => {
    const result = compareGroups(groupValues, scores);
    // values 1,1,2,2,3,3 -> mean 2, sum of squares 4, variance 4/5 -> sd sqrt(0.8)
    expect(result.groups[0].sd).toBeCloseTo(Math.sqrt(0.8), 10);
  });

  it("computes separation in pooled standard deviations", () => {
    const result = compareGroups(groupValues, scores);
    // means differ by 6; both groups have variance 0.8 so the pooled sd is also
    // sqrt(0.8) -> 6 / sqrt(0.8) = 6.708203...
    expect(result.separationSd).toBeCloseTo(6 / Math.sqrt(0.8), 6);
  });

  it("shares categorical bin values across both groups", () => {
    // Six distinct scores is well under MAX_DISTINCT_FOR_BARS and each repeats,
    // so this is categorical.
    const result = compareGroups(groupValues, scores);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2, 3, 7, 8, 9] });
    for (const group of result.groups) {
      expect(group.counts).toHaveLength(6);
    }
  });

  it("shares numeric bin edges across both groups when the column is continuous", () => {
    // 30 distinct values exceeds MAX_DISTINCT_FOR_BARS, so binning is numeric.
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const halves = many.map((_, i) => (i < 15 ? 0 : 1));
    const result = compareGroups(halves, many, 4);
    expect(result.bins.mode).toBe("numeric");
    expect(result.bins).toHaveProperty("edges");
    const edges = (result.bins as { edges: number[] }).edges;
    expect(edges).toHaveLength(5);
    expect(edges[0]).toBeCloseTo(1, 10);
    expect(edges[4]).toBeCloseTo(30, 10);
    for (const group of result.groups) {
      expect(group.counts).toHaveLength(4);
    }
  });

  it("counts every observation exactly once across numeric bins", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const halves = many.map((_, i) => (i < 15 ? 0 : 1));
    const result = compareGroups(halves, many, 4);
    const total = result.groups.reduce(
      (sum, g) => sum + g.counts.reduce((a, b) => a + b, 0), 0,
    );
    expect(total).toBe(30);
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

  it("uses one categorical bar per distinct value, ascending", () => {
    const result = compareGroups([0, 0, 1, 1], [2.5, 1, 1, 2.5]);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2.5] });
    expect(result.groups[0].counts).toEqual([1, 1]);
  });

  it("spaces unevenly distributed discrete values evenly", () => {
    // The whole point of categorical mode: 1, 2, 100 get three equal bars rather
    // than two crushed together and one far away with empty bins between.
    const result = compareGroups([0, 0, 0, 0, 0, 0], [1, 2, 100, 1, 2, 100]);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2, 100] });
    expect(result.groups[0].counts).toEqual([2, 2, 2]);
  });

  it("uses numeric bins when few distinct values are merely a small sample", () => {
    // 15 all-distinct values: few enough to look categorical, but with no repetition
    // there is no evidence the column is discrete rather than narrowly filtered.
    const sparse = Array.from({ length: 15 }, (_, i) => i / 100);
    const result = compareGroups(sparse.map(() => 0), sparse);
    expect(result.bins.mode).toBe("numeric");
  });

  it("stays categorical when values repeat, even at the distinct-value limit", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => i);
    const repeated = [...twenty, ...twenty];
    const result = compareGroups(repeated.map(() => 0), repeated);
    expect(result.bins.mode).toBe("categorical");
    expect(result.groups[0].counts).toHaveLength(20);
  });

  it("switches to numeric bins one value past the limit", () => {
    // Repeated, so only the distinct-value limit — not the repetition test —
    // can be what pushes this to numeric.
    const twentyOne = Array.from({ length: 21 }, (_, i) => i);
    const repeated = [...twentyOne, ...twentyOne];
    const result = compareGroups(repeated.map(() => 0), repeated);
    expect(result.bins.mode).toBe("numeric");
    expect(result.groups[0].counts).toHaveLength(20);
  });

  it("gives a single distinct score one categorical bar", () => {
    const result = compareGroups([0, 0, 1, 1], [3, 3, 3, 3]);
    expect(result.bins).toEqual({ mode: "categorical", values: [3] });
    expect(result.groups.map(g => g.counts)).toEqual([[2], [2]]);
  });

  it("gives a lone observation a categorical bar, since there is no spread to bin", () => {
    // One distinct value in one observation fails the repetition test, but a
    // single value is categorical regardless: there is no range to divide.
    const result = compareGroups([0], [3]);
    expect(result.bins).toEqual({ mode: "categorical", values: [3] });
    expect(result.groups[0].counts).toEqual([1]);
  });

  it("reports numeric mode with no edges for empty input", () => {
    expect(compareGroups([], []).bins).toEqual({ mode: "numeric", edges: [] });
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

describe("chooseBins", () => {
  it("returns null when nothing is usable", () => {
    expect(chooseBins([null, NaN, Infinity])).toBeNull();
  });

  it("uses one bar per distinct value when the values repeat", () => {
    // 3 distinct values, 9 usable — 3 * 2 <= 9, so categorical.
    const plan = chooseBins([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    expect(plan?.bins).toEqual({ mode: "categorical", values: [1, 2, 3] });
    expect(plan?.barCount).toBe(3);
  });

  it("treats a single distinct value as categorical even without repetition", () => {
    expect(chooseBins([7])?.bins).toEqual({ mode: "categorical", values: [7] });
  });

  it("uses equal-width bins when the values do not repeat", () => {
    // 5 distinct, 5 usable — 5 * 2 > 5, so numeric despite being under the limit.
    const plan = chooseBins([0, 1, 2, 3, 4], 4);
    expect(plan?.bins).toEqual({ mode: "numeric", edges: [0, 1, 2, 3, 4] });
    expect(plan?.barCount).toBe(4);
  });

  it("uses equal-width bins above the distinct-value limit", () => {
    // 21 distinct values, each appearing twice: repeats, but over MAX_DISTINCT_FOR_BARS.
    const values = [...Array(21).keys()].flatMap(i => [i, i]);
    expect(chooseBins(values)?.bins.mode).toBe("numeric");
  });

  it("maps a categorical value to its own bar", () => {
    const plan = chooseBins([1, 1, 5, 5, 9, 9]);
    expect(plan?.indexOf(5)).toBe(1);
    expect(plan?.indexOf(9)).toBe(2);
  });

  it("clamps a value the categorical plan was not built from", () => {
    const plan = chooseBins([1, 1, 5, 5, 9, 9]);
    expect(plan?.indexOf(-4)).toBe(0);
    expect(plan?.indexOf(99)).toBe(2);
    // Between two known values: lands on the first bar at or above it.
    expect(plan?.indexOf(3)).toBe(1);
  });

  it("clamps a value outside a numeric plan's range into an end bar", () => {
    const plan = chooseBins([0, 1, 2, 3, 4], 4);
    expect(plan?.indexOf(-10)).toBe(0);
    expect(plan?.indexOf(10)).toBe(3);
  });

  it("ignores nulls when deciding the mode", () => {
    // Without the filtering, the two nulls would inflate the usable count and
    // flip this from numeric to categorical.
    expect(chooseBins([0, 1, 2, null, null])?.bins.mode).toBe("numeric");
  });
});

describe("summarize", () => {
  // chooseBins returns BinPlan | null; these fixtures are known non-empty.
  const plan = chooseBins([0, 0, 1, 1, 2, 2]) as BinPlan;

  it("returns null when nothing is usable", () => {
    expect(summarize([null, NaN], plan)).toBeNull();
  });

  it("reports n, mean, min and max over the usable values", () => {
    const stats = summarize([0, 1, 2, null], plan);
    expect(stats?.n).toBe(3);
    expect(stats?.mean).toBeCloseTo(1, 10);
    expect(stats?.min).toBe(0);
    expect(stats?.max).toBe(2);
  });

  it("counts into the plan's bars, one entry per bar", () => {
    const stats = summarize([0, 0, 0, 2], plan);
    expect(stats?.counts).toEqual([3, 0, 1]);
  });

  it("counts a value the plan was not built from into a clamped bar", () => {
    expect(summarize([99], plan)?.counts).toEqual([0, 0, 1]);
  });

  it("treats NaN and Infinity as missing, like every other statistic here", () => {
    expect(summarize([0, NaN, Infinity, 2], plan)?.n).toBe(2);
  });

  it("gives two different subsets the same bins when they share a plan", () => {
    // The baseline spans 0..10; each subset spans only part of it. Planning from
    // the baseline is what keeps their bars aligned — planning from each subset
    // would give them different edges and make the two histograms incomparable.
    const baseline = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shared = chooseBins(baseline, 5) as BinPlan;
    expect(shared.bins).toEqual({ mode: "numeric", edges: [0, 2, 4, 6, 8, 10] });

    const low = summarize([0, 1, 2], shared);
    const high = summarize([8, 9, 10], shared);

    // Same length is not enough — the bars must mean the same thing. The low
    // subset fills the leading bars, the high subset the trailing one, and
    // 10 lands in the last bar rather than a sixth that does not exist.
    expect(low?.counts).toEqual([2, 1, 0, 0, 0]);
    expect(high?.counts).toEqual([0, 0, 0, 0, 3]);
  });
});
