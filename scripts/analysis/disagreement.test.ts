import { analyzeDisagreement, partialCorrelation } from "./disagreement";
import { S3Item } from "../../src/shared/types/s3-data";

const FIT = "fit";

/**
 * One pathway with importance 1, so an item's score IS its pathway prediction,
 * and its size is the distance from the decision boundary.
 *
 * Ten groups of ten. Group g (1..10) sits at distance g, and 10 - g of its items
 * disagree with the model, so disagreement falls off linearly with distance.
 * Reconstruction error also falls off linearly with distance, plus a jitter that
 * alternates within each group and so is unrelated to which items disagree.
 *
 * That makes the residual correlate with disagreement ONLY through distance,
 * which is the confound the analysis has to see through. Both relationships are
 * linear on purpose: a two-cluster fixture would make the residual an almost
 * perfect function of distance, and the partial correlation of two variables
 * given a near-perfect control is numerically unstable, which would make this
 * test fail for reasons that have nothing to do with the code.
 */
function fixture(): S3Item[] {
  const items: S3Item[] = [];
  for (let g = 1; g <= 10; g++) {
    for (let i = 0; i < 10; i++) {
      const disagrees = i < 10 - g;
      const residual = 1 - g / 20 + (i % 2 === 0 ? 0.05 : -0.05);
      items.push({
        id: `g${g}-i${i}`,
        sources: { test: [0] },
        text: "t",
        target: 1,
        target_label: null,
        // Always positive, so the pathways always predict class 1.
        pathway_scores: { [FIT]: [g] },
        reconstruction_r2: { [FIT]: 1 - residual },
        pathway_variance_fractions: { [FIT]: [1] },
        // The model says 0 on exactly the items meant to disagree.
        classification: disagrees ? 0 : 1,
      });
    }
  }
  return items;
}

describe("analyzeDisagreement", () => {
  // 10 groups, 10 - g disagreeing in group g, so 9 + 8 + ... + 0 = 45.
  it("counts agreement against the model", () => {
    const result = analyzeDisagreement(fixture(), FIT, [1]);
    expect(result).not.toBeNull();
    expect(result!.n).toBe(100);
    expect(result!.disagreements).toBe(45);
    expect(result!.agreement).toBeCloseTo(0.55, 10);
  });

  it("finds the raw correlation between disagreement and residual", () => {
    const result = analyzeDisagreement(fixture(), FIT, [1]);
    expect(result!.rDisagreeResidual).not.toBeNull();
    expect(result!.rDisagreeResidual!).toBeGreaterThan(0.3);
  });

  // The point of the analysis: the raw correlation is an artifact of distance
  // from the decision boundary, and controlling for it removes most of what
  // looked like a relationship. On this fixture raw 0.578 collapses to 0.123, a
  // ~79% reduction; it cannot reach zero because disagreement falls off in
  // integer steps per group while the residual falls off smoothly, so a little
  // non-linear signal survives a linear control. The same measurement on the
  // real yelp data lands at 0.020 / -0.031 / -0.007.
  //
  // Assert the claim (the control removes most of it), not a guessed magnitude.
  // The exact arithmetic is pinned by the partialCorrelation tests below.
  it("reports a much smaller correlation once distance from the boundary is controlled for", () => {
    const result = analyzeDisagreement(fixture(), FIT, [1]);
    const raw = result!.rDisagreeResidual;
    const partial = result!.partialDisagreeResidualGivenMargin;
    expect(raw).not.toBeNull();
    expect(partial).not.toBeNull();
    expect(Math.abs(partial!)).toBeLessThan(Math.abs(raw!) / 3);
    expect(Math.abs(partial!)).toBeLessThan(0.15);
  });

  it("summarises reconstruction quality per group", () => {
    const result = analyzeDisagreement(fixture(), FIT, [1]);
    expect(result!.meanR2Agree).toBeGreaterThan(result!.meanR2Disagree);
  });

  it("reports a disagreement rate for each residual quintile", () => {
    const result = analyzeDisagreement(fixture(), FIT, [1]);
    expect(result!.disagreementRateByResidualQuintile).toHaveLength(5);
    // Residual falls as distance grows, so the high-residual end disagrees more.
    const rates = result!.disagreementRateByResidualQuintile;
    expect(rates[4]).toBeGreaterThan(rates[0]);
  });

  it("skips items the model never scored", () => {
    const items = fixture();
    const unscored = { ...items[0], id: "unscored" };
    delete unscored.classification;
    items.push(unscored);
    expect(analyzeDisagreement(items, FIT, [1])!.n).toBe(100);
  });

  it("returns null when the fit has no usable importance", () => {
    expect(analyzeDisagreement(fixture(), FIT, [])).toBeNull();
  });
});

describe("partialCorrelation", () => {
  it("removes the control's share of the correlation", () => {
    // (0.5 - 0.6 * 0.7) / sqrt((1 - 0.36) * (1 - 0.49)) = 0.08 / 0.571314
    expect(partialCorrelation(0.5, 0.6, 0.7)!).toBeCloseTo(0.14, 3);
  });

  it("returns zero when the control explains the correlation exactly", () => {
    expect(partialCorrelation(0.6 * 0.7, 0.6, 0.7)!).toBeCloseTo(0, 10);
  });

  it("returns null when any correlation is undefined", () => {
    expect(partialCorrelation(null, 0.6, 0.7)).toBeNull();
    expect(partialCorrelation(0.5, null, 0.7)).toBeNull();
    expect(partialCorrelation(0.5, 0.6, null)).toBeNull();
  });

  // A perfect control leaves no residual variance to correlate.
  it("returns null when the control is perfectly correlated", () => {
    expect(partialCorrelation(0.5, 1, 0.7)).toBeNull();
  });
});
