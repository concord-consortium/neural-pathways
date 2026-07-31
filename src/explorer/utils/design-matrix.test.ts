import { Series } from "../types/explorer-data";
import { buildDesignMatrix } from "./design-matrix";

const series = (key: string, values: (number | null)[]): Series => ({
  key,
  label: key.toUpperCase(),
  kind: "attribute",
  description: "",
  values,
});

describe("buildDesignMatrix", () => {
  it("keeps only rows where the target and every predictor are usable", () => {
    const a = series("a", [1, 2, 3, 4]);
    const b = series("b", [1, null, 3, 4]);
    const target = series("t", [5, 6, 7, null]);
    const design = buildDesignMatrix([a, b], target, false);
    expect(design.nUsed).toBe(2);
    expect(design.nAvailable).toBe(4);
    expect(design.y).toEqual([5, 7]);
  });

  it("centers each predictor column", () => {
    const a = series("a", [1, 2, 3]);
    const design = buildDesignMatrix([a], series("t", [1, 2, 3]), false);
    expect(design.X.map(row => row[0])).toEqual([-1, 0, 1]);
  });

  it("labels columns with the series labels", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3]), series("b", [3, 1, 2])],
      series("t", [1, 2, 3]),
      false,
    );
    expect(design.columnLabels).toEqual(["A", "B"]);
  });

  it("reports how many rows each predictor alone was missing", () => {
    const a = series("a", [1, null, null, 4]);
    const b = series("b", [1, 2, 3, 4]);
    const design = buildDesignMatrix([a, b], series("t", [1, 2, 3, 4]), false);
    expect(design.missingByPredictor).toEqual({ a: 2, b: 0 });
  });

  it("appends pairwise interaction columns when asked", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 4]), series("b", [1, 3, 2, 8])],
      series("t", [1, 2, 3, 4]),
      true,
    );
    expect(design.columnLabels).toEqual(["A", "B", "A × B"]);
    expect(design.interactionCount).toBe(1);
  });

  it("builds interaction values from the centered columns", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3]), series("b", [2, 4, 9])],
      series("t", [1, 2, 3]),
      true,
    );
    // a centered: [-1, 0, 1]; b mean is 5 so b centered: [-3, -1, 4]
    expect(design.X.map(row => row[2])).toEqual([3, -0, 4]);
  });

  it("creates one interaction per unordered pair", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 9]), series("b", [2, 5, 3, 1]), series("c", [7, 1, 4, 2])],
      series("t", [1, 2, 3, 4]),
      true,
    );
    expect(design.interactionCount).toBe(3);
    expect(design.columnLabels).toContain("A × B");
    expect(design.columnLabels).toContain("A × C");
    expect(design.columnLabels).toContain("B × C");
  });

  it("adds no interaction columns when the flag is off", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3]), series("b", [3, 1, 2])],
      series("t", [1, 2, 3]),
      false,
    );
    expect(design.interactionCount).toBe(0);
    expect(design.columnLabels).toEqual(["A", "B"]);
  });

  it("drops a constant predictor and records why", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 4]), series("flat", [7, 7, 7, 7])],
      series("t", [1, 2, 3, 4]),
      false,
    );
    expect(design.columnLabels).toEqual(["A"]);
    expect(design.dropped).toEqual([{ label: "FLAT", reason: "constant" }]);
  });

  it("drops a duplicate predictor and records why", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 4]), series("copy", [2, 4, 6, 8])],
      series("t", [1, 2, 3, 5]),
      false,
    );
    expect(design.columnLabels).toEqual(["A"]);
    expect(design.dropped).toEqual([{ label: "COPY", reason: "duplicate" }]);
  });

  it("keeps a predictor that is merely strongly correlated", () => {
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 4, 5]), series("b", [1, 2, 3, 4, 9])],
      series("t", [1, 2, 3, 4, 5]),
      false,
    );
    expect(design.columnLabels).toEqual(["A", "B"]);
    expect(design.dropped).toEqual([]);
  });

  it("does not count dropped interaction columns toward interactionCount", () => {
    // b is constant, so A x B is constant too and both get dropped.
    const design = buildDesignMatrix(
      [series("a", [1, 2, 3, 4]), series("b", [5, 5, 5, 5])],
      series("t", [1, 2, 3, 4]),
      true,
    );
    expect(design.interactionCount).toBe(0);
    expect(design.columnLabels).toEqual(["A"]);
  });

  it("returns an empty design when no rows survive", () => {
    const design = buildDesignMatrix(
      [series("a", [null, null])],
      series("t", [1, 2]),
      false,
    );
    expect(design.nUsed).toBe(0);
    expect(design.X).toEqual([]);
    expect(design.y).toEqual([]);
  });

  it("returns an empty design when there are no predictors", () => {
    const design = buildDesignMatrix([], series("t", [1, 2, 3]), false);
    expect(design.columnLabels).toEqual([]);
    expect(design.nUsed).toBe(3);
  });
});
