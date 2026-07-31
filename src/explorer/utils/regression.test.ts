import { multipleRegression, logisticRegression } from "./regression";

describe("multipleRegression", () => {
  it("recovers R-squared of 1 for an exact linear relationship", () => {
    const X = [[1], [2], [3], [4], [5]];
    const y = [3, 5, 7, 9, 11];
    const result = multipleRegression(X, y);
    expect(result).not.toBeNull();
    expect((result as { rSquared: number }).rSquared).toBeCloseTo(1, 8);
  });

  it("gives a standardized beta of 1 for a single perfect predictor", () => {
    const result = multipleRegression([[1], [2], [3], [4], [5]], [3, 5, 7, 9, 11]);
    expect((result as { terms: { beta: number }[] }).terms[0].beta).toBeCloseTo(1, 8);
  });

  it("gives a negative beta for an inverse relationship", () => {
    const result = multipleRegression([[1], [2], [3], [4], [5]], [11, 9, 7, 5, 3]);
    expect((result as { terms: { beta: number }[] }).terms[0].beta).toBeCloseTo(-1, 8);
  });

  it("matches the squared correlation for a single predictor", () => {
    const X = [[1], [2], [3], [4], [5], [6]];
    const y = [2, 1, 4, 3, 6, 5];
    // Sxy = 14.5, Sxx = Syy = 17.5 -> r = 0.8285714, so R^2 = 0.6865306
    const result = multipleRegression(X, y) as { rSquared: number };
    expect(result.rSquared).toBeCloseTo(0.68653, 4);
  });

  it("labels terms by index when no labels are supplied", () => {
    const result = multipleRegression([[1, 2], [2, 1], [3, 5], [4, 3], [5, 9]], [1, 2, 3, 4, 5]);
    expect((result as { terms: { label: string }[] }).terms).toHaveLength(2);
  });

  it("splits credit between two predictors that both carry signal", () => {
    const X = [[1, 5], [2, 3], [3, 8], [4, 2], [5, 9], [6, 1]];
    const y = [2, 3, 6, 5, 9, 6];
    const result = multipleRegression(X, y) as { rSquared: number; terms: { beta: number }[] };
    expect(result.rSquared).toBeGreaterThan(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
    expect(result.terms).toHaveLength(2);
  });

  it("reports degrees of freedom as n minus k minus 1", () => {
    const X = [[1, 5], [2, 3], [3, 8], [4, 2], [5, 9], [6, 1]];
    const result = multipleRegression(X, [2, 3, 6, 5, 9, 6]) as { df: number; n: number };
    expect(result.n).toBe(6);
    expect(result.df).toBe(3);
  });

  it("gives a partial correlation equal to the simple correlation with one predictor", () => {
    // With a single predictor there is nothing to partial out, so |partial r|
    // must come back as the plain correlation, 0.8285714.
    const X = [[1], [2], [3], [4], [5], [6]];
    const y = [2, 1, 4, 3, 6, 5];
    const result = multipleRegression(X, y) as { terms: { partialR: number }[] };
    expect(Math.abs(result.terms[0].partialR)).toBeCloseTo(0.82857, 4);
  });

  it("keeps every partial correlation within [-1, 1]", () => {
    const X = [[1, 5], [2, 3], [3, 8], [4, 2], [5, 9], [6, 1]];
    const result = multipleRegression(X, [2, 3, 6, 5, 9, 6]) as {
      terms: { partialR: number }[];
    };
    for (const term of result.terms) {
      expect(Math.abs(term.partialR)).toBeLessThanOrEqual(1);
    }
  });

  it("returns null when the target has zero variance", () => {
    expect(multipleRegression([[1], [2], [3], [4]], [5, 5, 5, 5])).toBeNull();
  });

  it("returns null when there are too few rows for the terms", () => {
    expect(multipleRegression([[1, 2], [2, 1]], [1, 2])).toBeNull();
  });

  it("returns null for an empty design", () => {
    expect(multipleRegression([], [])).toBeNull();
  });

  it("returns null when two predictors are perfectly collinear", () => {
    const X = [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]];
    expect(multipleRegression(X, [1, 3, 2, 5, 4])).toBeNull();
  });
});

describe("logisticRegression", () => {
  it("finds a positive coefficient for a separating predictor", () => {
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const y = [0, 0, 0, 1, 1, 1];
    const result = logisticRegression(X, y);
    expect(result).not.toBeNull();
    expect((result as { terms: { coefficient: number }[] }).terms[0].coefficient)
      .toBeGreaterThan(0);
  });

  it("finds a negative coefficient when the relationship inverts", () => {
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const result = logisticRegression(X, [1, 1, 1, 0, 0, 0]) as {
      terms: { coefficient: number }[];
    };
    expect(result.terms[0].coefficient).toBeLessThan(0);
  });

  it("reports accuracy above the baseline for a predictive model", () => {
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const result = logisticRegression(X, [0, 0, 0, 1, 1, 1]) as {
      accuracy: number; baselineAccuracy: number;
    };
    expect(result.accuracy).toBeCloseTo(1, 6);
    expect(result.baselineAccuracy).toBeCloseTo(0.5, 6);
  });

  it("reports the majority-class rate as the baseline", () => {
    const X = [[-3], [-2], [-1], [1], [2], [3], [4], [5]];
    const y = [0, 0, 1, 1, 1, 1, 1, 1];
    const result = logisticRegression(X, y) as { baselineAccuracy: number };
    expect(result.baselineAccuracy).toBeCloseTo(0.75, 6);
  });

  it("reports accuracy no better than baseline for an unrelated predictor", () => {
    const X = [[1], [-1], [1], [-1], [1], [-1], [1], [-1]];
    const y = [0, 0, 1, 1, 0, 0, 1, 1];
    const result = logisticRegression(X, y) as { accuracy: number; baselineAccuracy: number };
    expect(result.accuracy).toBeLessThanOrEqual(result.baselineAccuracy + 1e-9);
  });

  it("returns n as the number of rows", () => {
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    expect((logisticRegression(X, [0, 0, 0, 1, 1, 1]) as { n: number }).n).toBe(6);
  });

  it("returns null when the target is all one class", () => {
    expect(logisticRegression([[1], [2], [3], [4]], [1, 1, 1, 1])).toBeNull();
  });

  it("returns null when the target is not binary", () => {
    expect(logisticRegression([[1], [2], [3], [4]], [0, 1, 2, 1])).toBeNull();
  });

  it("returns null for an empty design", () => {
    expect(logisticRegression([], [])).toBeNull();
  });

  it("returns null when there are too few rows for the terms", () => {
    expect(logisticRegression([[1, 2], [2, 1]], [0, 1])).toBeNull();
  });
});
