import { pearson } from "../../src/explorer/utils/statistics";
import { solvedFor } from "./attributes";
import { CheckResult } from "./checks";
import { GeneratorRun } from "./pipeline";

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export function formatSummary(run: GeneratorRun, checks: CheckResult[]): string {
  const { config, corpus, solvedAttributes, outcomes, dataset } = run;
  const lines: string[] = [];

  lines.push(`alien dataset — seed ${config.seed}, ${config.conversationCount} conversations`);
  lines.push(`output ${config.outputDir}, fit "${config.fitName}"`);
  lines.push("");

  const fit = dataset.index.metadata.fa_fits[config.fitName];
  lines.push("variance split (target -> realized)");
  fit.explained_variance_per_pathway.forEach((realized, p) => {
    lines.push(`  P${p}  ${percent(config.targetVarianceShares[p])} -> ${percent(realized)}`);
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

  lines.push("self-checks");
  for (const check of checks) {
    lines.push(`  ${check.passed ? "PASS" : "FAIL"}  ${pad(check.name, 26)}${check.detail}`);
  }

  return lines.join("\n");
}
