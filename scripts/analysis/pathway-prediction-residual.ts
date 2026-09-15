/**
 * Does pathway/model disagreement track reconstruction error on yelp?
 *
 * Fetches the published yelp index and reports, per FA fit, how often the
 * pathway prediction disagrees with the model and whether that disagreement is
 * explained by reconstruction error or by distance from the decision boundary.
 *
 * Usage: npm run analyze:pathway-prediction
 * Findings: docs/pathway-prediction-target-analysis.md
 */
import { fetchIndex } from "../../src/shared/data-loader";
import { yelpDataset } from "../../src/shared/datasets/yelp-dataset";
import { analyzeDisagreement } from "./disagreement";

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
const num = (value: number | null) => (value == null ? "n/a" : value.toFixed(3));
const num4 = (value: number | null) => (value == null ? "n/a" : value.toFixed(4));

async function main() {
  const index = await fetchIndex(yelpDataset);

  for (const [fitName, fit] of Object.entries(index.metadata.fa_fits)) {
    const result = analyzeDisagreement(index.items, fitName, fit.pathway_importance);
    console.log(`\n=== ${fitName} (FA fit on ${fit.source_split}) ===`);
    if (!result) {
      console.log("  no scored items with a reconstruction R² for this fit");
      continue;
    }
    console.log(`  items analysed: ${result.n}`);
    console.log(`  agrees with the model: ${pct(result.agreement)} (${result.disagreements} disagree)`);
    console.log(`  pathway 0 alone would disagree on: ${result.p0Disagreements}`);
    console.log(`  corr(disagree, residual):            ${num(result.rDisagreeResidual)}`);
    console.log(`  corr(disagree, |pathway sum|):       ${num(result.rDisagreeMargin)}`);
    console.log(`  corr(|pathway sum|, residual):       ${num(result.rMarginResidual)}`);
    console.log(`  partial corr(disagree, residual | |pathway sum|): `
      + `${num(result.partialDisagreeResidualGivenMargin)}`);
    console.log(`  mean reconstruction R²: agree ${num4(result.meanR2Agree)}, `
      + `disagree ${num4(result.meanR2Disagree)}`);
    console.log(`  disagreement rate by residual quintile (low→high): ${
      result.disagreementRateByResidualQuintile.map(r => pct(r)).join("  ")}`);
    if (result.logistic) {
      console.log(`  logistic disagree ~ |pathway sum| + residual: `
        + `margin ${result.logistic.margin.toFixed(2)}, residual ${result.logistic.residual.toFixed(2)}`);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
