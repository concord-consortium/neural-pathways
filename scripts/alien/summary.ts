import { pearson } from "../../src/explorer/utils/statistics";
import { solvedFor } from "./attributes";
import { CheckResult, recoveryReport } from "./checks";
import { fitFactorAnalysis } from "./factor-analysis";
import { GeneratorRun } from "./pipeline";

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function quantile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
}

export function formatSummary(run: GeneratorRun, checks: CheckResult[]): string {
  const { config, corpus, solvedAttributes, outcomes, dataset } = run;
  const lines: string[] = [];

  lines.push(`alien dataset — seed ${config.seed}, ${dataset.index.reviews.length} conversations`);
  lines.push(`output ${config.outputDir}, fit "${config.fitName}"`);
  lines.push("");

  lines.push("word-sum variance split (target -> realized; what SCALE was tuned for)");
  const wordSumVariances = corpus.scoreSd.map(sd => sd * sd);
  const wordSumTotal = wordSumVariances.reduce((sum, value) => sum + value, 0);
  wordSumVariances.forEach((variance, p) => {
    lines.push(`  P${p}  ${percent(config.targetVarianceShares[p])} -> ${percent(variance / wordSumTotal)}`);
  });
  lines.push("");

  lines.push("pathway x pathway correlation");
  for (let a = 0; a < config.pathwayCount; a++) {
    const row = [];
    for (let b = 0; b < config.pathwayCount; b++) {
      const r = a === b
        ? 1
        : pearson(corpus.scores.map(s => s[a]), corpus.scores.map(s => s[b])).r ?? 0;
      row.push(pad(r.toFixed(3), 8));
    }
    lines.push(`  P${a}  ${row.join("")}`);
  }
  lines.push("");

  lines.push("attributes");
  lines.push(`  ${pad("key", 20)}${pad("pathway", 9)}${pad("requested", 11)}`
    + `${pad("achieved", 10)}${pad("ceiling", 9)}${pad("hidden", 8)}shares`);
  for (const attribute of config.attributes) {
    const solved = solvedFor(solvedAttributes, attribute.key);
    lines.push(
      `  ${pad(attribute.key, 20)}`
      + `${pad(attribute.pathway === null ? "decoy" : `P${attribute.pathway}`, 9)}`
      + `${pad(attribute.pathway === null ? "-" : attribute.targetR.toFixed(3), 11)}`
      + `${pad(solved.achievedR === null ? "-" : solved.achievedR.toFixed(3), 10)}`
      + `${pad(solved.ceilingR === null ? "-" : solved.ceilingR.toFixed(3), 9)}`
      + `${pad(attribute.hidden ? "yes" : "no", 8)}`
      + solved.achievedShares.map(share => percent(share)).join(" "),
    );
  }
  lines.push("");

  const achieved = outcomes.achieved;
  lines.push("classification");
  lines.push(`  solved sigma_target ${outcomes.sigmaTarget.toFixed(4)}, `
    + `beta ${outcomes.beta.toFixed(4)} on "${config.biasAttributeKey}"`);
  lines.push(`  target positive rate            ${percent(achieved.positiveTargetRate)}`);
  lines.push(`  error rate, ${config.biasAttributeKey}=1   `
    + `${percent(config.errorRateWhenBiasOn)} requested -> `
    + `${percent(achieved.errorRateWhenBiasOn)} achieved`);
  lines.push(`  error rate, ${config.biasAttributeKey}=0   `
    + `${percent(config.errorRateWhenBiasOff)} requested -> `
    + `${percent(achieved.errorRateWhenBiasOff)} achieved`);
  lines.push(`  overall error rate              ${percent(achieved.overallErrorRate)}`);
  lines.push(`  share of errors on the group    ${percent(achieved.shareOfErrorsWhenBiasOn)}`);
  lines.push(`  corr(model_correct, bias)       ${achieved.corrCorrectWithBias.toFixed(4)}`);
  lines.push(`  corr(target, bias)              ${achieved.corrTargetWithBias.toFixed(4)}`);
  lines.push("");

  const { activations } = run;
  const { neuronCount, explainedVarianceTotal } = config.activations;
  const fit = dataset.index.metadata.fa_fits[config.fitName];
  const refit = fitFactorAnalysis(activations.standardized, config.pathwayCount);
  lines.push("activations");
  lines.push(`  ${neuronCount} neurons, explained variance total `
    + `${explainedVarianceTotal.toFixed(3)} target -> ${refit.explainedVarianceTotal.toFixed(3)} refit`);
  lines.push(`  loadings share    ${fit.explained_variance_per_pathway
    .map((share, p) => `P${p} ${share.toFixed(3)}`).join("  ")}`);
  const r2 = activations.reconstructionR2;
  const r2Mean = r2.reduce((sum, value) => sum + value, 0) / r2.length;
  const r2Sd = Math.sqrt(r2.reduce((sum, value) => sum + (value - r2Mean) ** 2, 0) / r2.length);
  lines.push(`  reconstruction R2   mean ${r2Mean.toFixed(3)}  sd ${r2Sd.toFixed(3)}  `
    + `p10 ${quantile(r2, 0.1).toFixed(3)}`);
  lines.push(`  FA recovery         ${recoveryReport(run)
    .map(e => `P${e.pathway}->F${e.factor} r ${e.scoreR.toFixed(3)} cos ${e.loadingCosine.toFixed(3)}`)
    .join("   ")}`);
  const byCount: string[] = [];
  for (let k = 1; k <= config.pathwayCount + 1; k++) {
    byCount.push(`${k}: ${fitFactorAnalysis(activations.standardized, k).explainedVarianceTotal.toFixed(3)}`);
  }
  lines.push(`  refit explained variance by pathway count   ${byCount.join("  ")}`);
  lines.push("");

  lines.push("self-checks");
  for (const check of checks) {
    lines.push(`  ${check.passed ? "PASS" : "FAIL"}  ${pad(check.name, 26)}${check.detail}`);
  }

  return lines.join("\n");
}
