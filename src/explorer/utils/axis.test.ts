import { formatAxisValue, selectTickIndices } from "./axis";

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
