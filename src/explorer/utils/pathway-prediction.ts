/**
 * What the pathways predict on their own: each pathway score times that
 * pathway's importance in the selected fit, summed.
 *
 * `pathway_importance` is a logistic regression coefficient per pathway — signed
 * log-odds per standard deviation — so this sum is log-odds WITHOUT an intercept,
 * and thresholding it at zero is not exactly the model's decision boundary. That
 * is deliberate: on the yelp test split the corrected variants agree with this one
 * on at least 99.7% of reviews, and the intercept that accompanied the published
 * coefficients cannot be recovered from the published data. See
 * docs/superpowers/specs/2026-09-11-pathway-prediction-design.md.
 *
 * Returns null when the fit carries no usable importance for these scores: a
 * missing, empty, or differently-sized array cannot be paired with them by index.
 */
export function pathwayPrediction(
  scores: number[],
  importance: number[] | undefined,
): number | null {
  if (!importance || importance.length === 0) return null;
  if (importance.length !== scores.length) return null;

  let sum = 0;
  for (let i = 0; i < scores.length; i++) sum += scores[i] * importance[i];
  return sum;
}

/**
 * The class a pathway prediction implies. Zero counts as class 1, matching
 * logisticRegression (src/explorer/utils/regression.ts), which classifies on
 * `eta >= 0`.
 */
export function pathwayPredictionClass(sum: number): number {
  return sum >= 0 ? 1 : 0;
}
