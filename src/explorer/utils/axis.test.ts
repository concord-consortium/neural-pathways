import { formatAxisValue, selectTickIndices, barTitle, axisValueLabel } from "./axis";
import { Bins } from "./statistics";

describe("formatAxisValue", () => {
  it("keeps a meaningful decimal", () => {
    expect(formatAxisValue(1.5)).toBe("1.5");
  });

  it("drops trailing zeros from a whole number", () => {
    expect(formatAxisValue(3)).toBe("3");
  });

  it("rounds to three decimal places", () => {
    expect(formatAxisValue(0.33333)).toBe("0.333");
  });

  it("formats a negative value", () => {
    expect(formatAxisValue(-1.204)).toBe("-1.204");
  });

  it("renders a negative zero as plain zero", () => {
    // -0.0001 rounds to "-0.000", whose Number() is -0. -0.001 is now a
    // representable value, so it no longer exercises the guard.
    expect(formatAxisValue(-0.0001)).toBe("0");
  });

  it("keeps closely spaced values distinct", () => {
    expect(formatAxisValue(0.412)).toBe("0.412");
    expect(formatAxisValue(0.415)).toBe("0.415");
    expect(formatAxisValue(0.418)).toBe("0.418");
  });

  it("leaves a large value intact", () => {
    expect(formatAxisValue(6427)).toBe("6427");
  });
});

describe("selectTickIndices", () => {
  it("returns every index when they all fit", () => {
    expect(selectTickIndices(5, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns every index when the count equals the limit", () => {
    expect(selectTickIndices(10, 10)).toHaveLength(10);
  });

  it("thins the indices when there are too many", () => {
    expect(selectTickIndices(18, 10)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 17]);
  });

  it("always includes the final index", () => {
    const indices = selectTickIndices(20, 10);
    expect(indices[indices.length - 1]).toBe(19);
  });

  it("never exceeds the limit by more than the forced final index", () => {
    for (const count of [11, 15, 20, 37, 100]) {
      expect(selectTickIndices(count, 10).length).toBeLessThanOrEqual(11);
    }
  });

  it("returns ascending indices with no duplicates", () => {
    const indices = selectTickIndices(20, 10);
    expect([...new Set(indices)]).toEqual(indices);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it("returns a single index for one item", () => {
    expect(selectTickIndices(1, 10)).toEqual([0]);
  });

  it("returns nothing for an empty axis", () => {
    expect(selectTickIndices(0, 10)).toEqual([]);
  });
});

describe("barTitle", () => {
  it("names a categorical bar by its value", () => {
    const bins: Bins = { mode: "categorical", values: [1, 2, 3] };
    expect(barTitle(bins, 1, 40, "Review rating", "reviews"))
      .toBe("Review rating 2 — 40 reviews");
  });

  it("names a numeric bar by the range it spans", () => {
    const bins: Bins = { mode: "numeric", edges: [0, 0.5, 1] };
    expect(barTitle(bins, 0, 7, "P0", "conversations"))
      .toBe("P0 0 to 0.5 — 7 conversations");
  });

  it("names a categorical bar by its value label when the dataset supplies one", () => {
    const bins: Bins = { mode: "categorical", values: [0, 1] };
    expect(barTitle(bins, 1, 2998, "Actual sentiment", "reviews", { 0: "negative", 1: "positive" }))
      .toBe("Actual sentiment positive — 2998 reviews");
  });

  it("falls back to the number for a value the label map does not list", () => {
    // A partial map must degrade to the number rather than mislabel the bar.
    const bins: Bins = { mode: "categorical", values: [0, 1, 2] };
    expect(barTitle(bins, 2, 5, "Rating", "reviews", { 0: "low", 1: "high" }))
      .toBe("Rating 2 — 5 reviews");
  });

  it("names a numeric bar by its range even when value labels are supplied", () => {
    // A numeric bar spans a range of values, which no single label describes.
    const bins: Bins = { mode: "numeric", edges: [0, 0.5, 1] };
    expect(barTitle(bins, 0, 7, "P0", "reviews", { 0: "negative", 1: "positive" }))
      .toBe("P0 0 to 0.5 — 7 reviews");
  });
});

describe("axisValueLabel", () => {
  it("uses the dataset's label for a listed value", () => {
    expect(axisValueLabel(1, { 0: "no", 1: "yes" })).toBe("yes");
  });

  it("falls back to the formatted number for an unlisted value", () => {
    expect(axisValueLabel(2, { 0: "no", 1: "yes" })).toBe("2");
  });

  it("falls back to the formatted number when there is no map at all", () => {
    expect(axisValueLabel(0.4271)).toBe("0.427");
  });
});
