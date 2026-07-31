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

  it("rejects a fit whose raw R-squared overshoots 1 by more than rounding noise", () => {
    // Five predictors, the fifth built as the sum of the other four plus a sliver of
    // noise: not an exact duplicate of any single column (so design-matrix.ts's
    // pairwise duplicate check would not catch it), but collinear enough as a set
    // that the correlation matrix is ill-conditioned. It still clears
    // PIVOT_TOLERANCE, so invertSymmetric returns an answer — just one imprecise
    // enough that beta blows up (coefficients past 30 in magnitude) and the raw R^2
    // computed from beta . c lands at roughly 1.0000028, not merely a rounding hair
    // over 1. That must be rejected rather than clamped down to a confident 1.000.
    const X = [
      [-2.5043631938772104, 1.7995262177658855, -3.4243023388200915, 0.288333895284838, -3.8407006260809933],
      [-4.742754101633445, 1.5878677398841212, 4.813236300746555, -3.6203765862716253, -1.9620465238429197],
      [-4.570918418267238, 4.620609287927211, 0.6186127688822396, 3.699322048900333, 4.3676872473779405],
      [1.5703840584356266, -4.527359008568972, -1.6739344581374593, 2.6559388673193474, -1.9748587583169577],
      [-4.387544393254232, 4.213238064764644, 4.605410103502408, -4.059125184574689, 0.37187015967100534],
      [3.6150184313836595, 0.5477845694626615, 3.756115440631339, -3.02503198293272, 4.893948518436021],
      [-4.439039230085462, 0.5270564581859194, -3.78282308521812, -0.7936447839223054, -8.488376834063443],
      [-3.8405701512659762, 3.743766550321024, -4.301535784872964, -0.3344339110583222, -4.732838649213627],
      [-2.009692786731614, -2.4927437293775117, 4.1207855982337085, -1.6952437147010317, -2.07688427384358],
      [0.5385750557941271, 1.465429070622395, 4.34055328804094, -4.861158728534896, 1.4834578982923579],
    ];
    const y = [
      -3.3449739257988758, -0.15638568213821652, -1.5394933635593024, -0.25058061163485906,
      0.146329154130797, 4.177923946680172, -4.9550303221528855, -4.543439159980598,
      0.8467631041140276, 2.592818248307596,
    ];
    expect(multipleRegression(X, y)).toBeNull();
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

  it("recodes a non-0/1 binary target consistently with the equivalent 0/1 target", () => {
    // A filter like review_stars:[1 TO 2] yields a target of {1, 2}, not {0, 1}. The
    // fit should treat that the same as {0, 1}: same separating relationship, same
    // sign of the coefficient.
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const zeroOne = logisticRegression(X, [0, 0, 0, 1, 1, 1]) as { terms: { coefficient: number }[] };
    const oneTwo = logisticRegression(X, [1, 1, 1, 2, 2, 2]) as { terms: { coefficient: number }[] };
    expect(zeroOne).not.toBeNull();
    expect(oneTwo).not.toBeNull();
    expect(Math.sign(oneTwo.terms[0].coefficient)).toBe(Math.sign(zeroOne.terms[0].coefficient));
  });
});
