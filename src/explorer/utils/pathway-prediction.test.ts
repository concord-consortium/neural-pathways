import { pathwayPrediction, pathwayPredictionClass } from "./pathway-prediction";

describe("pathwayPrediction", () => {
  it("sums each score times its importance", () => {
    expect(pathwayPrediction([2, -1, 0.5], [1.5, 2, -4])).toBeCloseTo(-1, 10);
  });

  it("returns null when importance is undefined", () => {
    expect(pathwayPrediction([1, 2], undefined)).toBeNull();
  });

  it("returns null when importance is empty", () => {
    expect(pathwayPrediction([1, 2], [])).toBeNull();
  });

  // A fit whose importance is a different length than the item's scores cannot be
  // combined with them at all; pairing them by index would produce a confident
  // number out of mismatched arrays.
  it("returns null when the lengths differ", () => {
    expect(pathwayPrediction([1, 2, 3], [1, 2])).toBeNull();
    expect(pathwayPrediction([1, 2], [1, 2, 3])).toBeNull();
  });

  it("returns null when there are no scores", () => {
    expect(pathwayPrediction([], [])).toBeNull();
  });
});

describe("pathwayPredictionClass", () => {
  it("treats a positive sum as class 1 and a negative sum as class 0", () => {
    expect(pathwayPredictionClass(0.01)).toBe(1);
    expect(pathwayPredictionClass(-0.01)).toBe(0);
  });

  // Matches logisticRegression in regression.ts, which classifies on eta >= 0.
  it("treats exactly zero as class 1", () => {
    expect(pathwayPredictionClass(0)).toBe(1);
  });
});
