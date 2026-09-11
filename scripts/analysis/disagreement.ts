import { S3Item } from "../../src/shared/types/s3-data";
import { pathwayPrediction, pathwayPredictionClass } from "../../src/explorer/utils/pathway-prediction";
import { pearson } from "../../src/explorer/utils/statistics";
import { logisticRegression } from "../../src/explorer/utils/regression";

export interface DisagreementAnalysis {
  fitName: string;
  /** Items with both a classification and a reconstruction R² for this fit. */
  n: number;
  agreement: number;
  disagreements: number;
  /** Disagreements when only pathway 0 is used, for comparison. */
  p0Disagreements: number;
  rDisagreeResidual: number | null;
  rDisagreeMargin: number | null;
  rMarginResidual: number | null;
  partialDisagreeResidualGivenMargin: number | null;
  meanR2Agree: number;
  meanR2Disagree: number;
  /** Disagreement rate within each fifth of the residual range, lowest first. */
  disagreementRateByResidualQuintile: number[];
  /** Standardized log-odds per SD from a joint fit; null when it cannot be fit. */
  logistic: { margin: number; residual: number } | null;
}

/**
 * Partial correlation of x and y controlling for z, from the three pairwise
 * correlations. Null when any of them is undefined or the control is perfect.
 *
 * Exported so the arithmetic is pinned directly: a fixture can show that the
 * confound is removed, but only a direct test fixes the formula itself.
 */
export function partialCorrelation(
  rxy: number | null, rxz: number | null, ryz: number | null,
): number | null {
  if (rxy == null || rxz == null || ryz == null) return null;
  const denominator = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  if (denominator === 0) return null;
  return (rxy - rxz * ryz) / denominator;
}

const mean = (values: number[]) =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * How often the pathway prediction disagrees with the model, and whether that
 * disagreement is explained by reconstruction error or merely by the item
 * sitting near the pathways' own decision boundary.
 *
 * Only items the model scored AND that have a reconstruction R² for this fit
 * take part; on yelp that is the test split.
 */
export function analyzeDisagreement(
  items: S3Item[], fitName: string, importance: number[],
): DisagreementAnalysis | null {
  const disagree: number[] = [];
  const residual: number[] = [];
  const margin: number[] = [];
  const r2s: number[] = [];
  let p0Disagreements = 0;

  for (const item of items) {
    if (item.classification == null) continue;
    const scores = item.pathway_scores[fitName];
    const r2 = item.reconstruction_r2?.[fitName];
    if (!scores || r2 == null) continue;

    const prediction = pathwayPrediction(scores, importance);
    if (prediction == null) continue;

    disagree.push(pathwayPredictionClass(prediction) === item.classification ? 0 : 1);
    margin.push(Math.abs(prediction));
    residual.push(1 - r2);
    r2s.push(r2);

    const p0 = pathwayPredictionClass(scores[0] * importance[0]);
    if (p0 !== item.classification) p0Disagreements++;
  }

  if (disagree.length === 0) return null;

  const rDisagreeResidual = pearson(disagree, residual).r;
  const rDisagreeMargin = pearson(disagree, margin).r;
  const rMarginResidual = pearson(margin, residual).r;

  const byResidual = residual
    .map((value, i) => ({ value, disagreed: disagree[i] }))
    .sort((a, b) => a.value - b.value);
  const quintiles: number[] = [];
  for (let q = 0; q < 5; q++) {
    const slice = byResidual.slice(
      Math.floor((q * byResidual.length) / 5),
      Math.floor(((q + 1) * byResidual.length) / 5),
    );
    quintiles.push(slice.length === 0 ? 0 : mean(slice.map(s => s.disagreed)));
  }

  const fit = logisticRegression(margin.map((m, i) => [m, residual[i]]), disagree);

  return {
    fitName,
    n: disagree.length,
    agreement: disagree.filter(d => d === 0).length / disagree.length,
    disagreements: disagree.filter(d => d === 1).length,
    p0Disagreements,
    rDisagreeResidual,
    rDisagreeMargin,
    rMarginResidual,
    partialDisagreeResidualGivenMargin:
      partialCorrelation(rDisagreeResidual, rDisagreeMargin, rMarginResidual),
    meanR2Agree: mean(r2s.filter((_, i) => disagree[i] === 0)),
    meanR2Disagree: mean(r2s.filter((_, i) => disagree[i] === 1)),
    disagreementRateByResidualQuintile: quintiles,
    logistic: fit && fit.terms.length === 2
      ? { margin: fit.terms[0].coefficient, residual: fit.terms[1].coefficient }
      : null,
  };
}
