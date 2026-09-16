import { pearson } from "../../src/explorer/utils/statistics";
import { solvedFor } from "./attributes";
import { factorScores, fitFactorAnalysis } from "./factor-analysis";
import { GeneratorRun } from "./pipeline";

export interface CheckResult {
  name: string;
  passed: boolean;
  /** The measured value beside the threshold it was judged against. */
  detail: string;
}

function worst(values: number[]): number {
  return values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
}

function shapAdditivity(run: GeneratorRun): CheckResult {
  const { config, dataset } = run;
  const scoreById = new Map(
    dataset.index.reviews.map(review => [review.id, review.pathway_scores[config.fitName]]),
  );
  let largest = 0;
  for (const bucket of dataset.shapBuckets.values()) {
    for (const entry of bucket.reviews) {
      const expected = scoreById.get(entry.id) as number[];
      for (let p = 0; p < config.pathwayCount; p++) {
        const total = entry.words.reduce((sum, word) => sum + word.scores[p], entry.base_values[p]);
        largest = Math.max(largest, Math.abs(total - expected[p]));
      }
    }
  }
  const limit = config.thresholds.shapTolerance;
  return {
    name: "shap-additivity",
    passed: largest <= limit,
    detail: `largest deviation ${largest.toExponential(2)} (limit ${limit.toExponential(2)})`,
  };
}

function noteEvidence(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, notes } = run;
  const problems: string[] = [];
  notes.forEach((note, i) => {
    for (const attribute of config.attributes) {
      const value = solvedFor(solvedAttributes, attribute.key).values[i];
      const attesting = attribute.notes[value].filter(fragment => note.includes(fragment));
      if (attesting.length !== 1) {
        problems.push(`item ${i} ${attribute.key}=${value} attested ${attesting.length} times`);
      }
      for (const [other, fragments] of Object.entries(attribute.notes)) {
        if (Number(other) === value) continue;
        if (fragments.some(fragment => note.includes(fragment))) {
          problems.push(`item ${i} ${attribute.key} note attests a value it does not have`);
        }
      }
    }
  });
  return {
    name: "note-evidence",
    passed: problems.length === 0,
    detail: problems.length === 0
      ? `all ${notes.length} notes attest all ${config.attributes.length} attributes exactly once`
      : `${problems.length} problems, first: ${problems[0]}`,
  };
}

function achievedCorrelations(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes } = run;
  const tolerance = config.thresholds.correlationTolerance;
  const misses: string[] = [];
  let largest = 0;
  for (const attribute of config.attributes) {
    if (attribute.pathway === null) continue;
    const achieved = solvedFor(solvedAttributes, attribute.key).achievedR ?? 0;
    const gap = Math.abs(achieved - attribute.targetR);
    largest = Math.max(largest, gap);
    if (gap > tolerance) {
      misses.push(`${attribute.key} requested ${attribute.targetR} achieved ${achieved.toFixed(3)}`);
    }
  }
  return {
    name: "achieved-correlations",
    passed: misses.length === 0,
    detail: misses.length === 0
      ? `largest gap ${largest.toFixed(4)} (tolerance ${tolerance})`
      : misses.join("; "),
  };
}

function wordCoverage(run: GeneratorRun): CheckResult {
  const { config, corpus } = run;
  const counts = new Map<string, number>(config.vocabulary.map(entry => [entry.word, 0]));
  for (const conversation of corpus.conversations) {
    // Counts conversations, not occurrences: a word used ten times in one
    // conversation still gives a reader only one place to see its effect.
    const seen = new Set<string>();
    for (const turn of conversation.turns) for (const word of turn) seen.add(word);
    for (const word of seen) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const minimum = config.thresholds.minWordOccurrences;
  const rare = [...counts.entries()].filter(([, count]) => count < minimum);
  const lowest = Math.min(...counts.values());
  return {
    name: "word-coverage",
    passed: rare.length === 0,
    detail: rare.length === 0
      ? `rarest word appears in ${lowest} conversations (minimum ${minimum})`
      : `${rare.length} words below ${minimum}: ${rare.map(([word]) => word).join(", ")}`,
  };
}

function truthIsUnbiased(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, outcomes } = run;
  const bias = solvedFor(solvedAttributes, config.biasAttributeKey);
  const r = pearson(outcomes.target, bias.values).r ?? 0;
  const limit = config.thresholds.truthBiasMax;
  return {
    name: "truth-is-unbiased",
    passed: Math.abs(r) <= limit,
    detail: `corr(target, ${config.biasAttributeKey}) = ${r.toFixed(4)} (limit ${limit}). `
      + `Above the limit the truth tracks the attribute and the model is correct, not biased.`,
  };
}

function biasIsDetectable(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, outcomes } = run;
  const bias = solvedFor(solvedAttributes, config.biasAttributeKey);
  const r = pearson(outcomes.modelCorrect, bias.values).r ?? 0;
  const minimum = config.thresholds.detectableBiasMin;
  return {
    name: "bias-is-detectable",
    passed: Math.abs(r) >= minimum,
    detail: `corr(model_correct, ${config.biasAttributeKey}) = ${r.toFixed(4)} `
      + `(minimum magnitude ${minimum}). Below it the bias is there but too weak to find.`,
  };
}

function decoysAreDecoys(run: GeneratorRun): CheckResult {
  const { config, corpus, solvedAttributes } = run;
  const limit = config.thresholds.decoyMax;
  const offenders: string[] = [];
  let largest = 0;
  for (const attribute of config.attributes) {
    if (attribute.pathway !== null) continue;
    const values = solvedFor(solvedAttributes, attribute.key).values;
    for (let p = 0; p < config.pathwayCount; p++) {
      const r = pearson(values, corpus.scores.map(row => row[p])).r ?? 0;
      largest = Math.max(largest, Math.abs(r));
      if (Math.abs(r) > limit) {
        offenders.push(`${attribute.key} vs pathway ${p}: ${r.toFixed(3)} (limit ${limit})`);
      }
    }
  }
  return {
    name: "decoys-are-decoys",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `largest decoy correlation ${largest.toFixed(4)} (limit ${limit})`
      : offenders.join("; "),
  };
}

function pathwaysAreOrthogonal(run: GeneratorRun): CheckResult {
  const { config, corpus } = run;
  const limit = config.thresholds.pathwayOrthogonalityMax;
  const offenders: string[] = [];
  const offDiagonal: number[] = [];
  for (let a = 0; a < config.pathwayCount; a++) {
    for (let b = a + 1; b < config.pathwayCount; b++) {
      const r = pearson(corpus.scores.map(row => row[a]), corpus.scores.map(row => row[b])).r ?? 0;
      offDiagonal.push(r);
      if (Math.abs(r) > limit) offenders.push(`P${a} vs P${b}: ${r.toFixed(3)} (limit ${limit})`);
    }
  }
  return {
    name: "pathways-are-orthogonal",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `largest off-diagonal |r| ${worst(offDiagonal).toFixed(4)} (limit ${limit})`
      : `${offenders.join("; ")}. Correlated pathways undermine both bias checks above.`,
  };
}

export interface PathwayRecovery {
  pathway: number;
  /** The recovered factor whose scores correlate most with this pathway's. */
  factor: number;
  /** |r| between the authored scores and that factor's scores. */
  scoreR: number;
  /** |cosine| between the authored loading row and that factor's loadings. */
  loadingCosine: number;
}

function cosine(a: number[], b: number[]): number {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    ab += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return ab / Math.sqrt(aa * bb);
}

/**
 * Refits factor analysis on the emitted activations, exactly as the pipeline
 * would, and matches each authored pathway to the recovered factor its scores
 * correlate with most. Shared with the summary so the two never disagree.
 */
export function recoveryReport(run: GeneratorRun): PathwayRecovery[] {
  const { config, corpus, activations } = run;
  const fit = fitFactorAnalysis(activations.standardized, config.pathwayCount);
  const recovered = factorScores(activations.standardized, fit);
  const report: PathwayRecovery[] = [];
  for (let p = 0; p < config.pathwayCount; p++) {
    const authored = corpus.scores.map(row => row[p]);
    let best = { factor: -1, scoreR: -1 };
    for (let q = 0; q < config.pathwayCount; q++) {
      const r = Math.abs(pearson(authored, recovered.map(row => row[q])).r ?? 0);
      if (r > best.scoreR) best = { factor: q, scoreR: r };
    }
    report.push({
      pathway: p,
      factor: best.factor,
      scoreR: best.scoreR,
      loadingCosine: Math.abs(cosine(activations.loadings[p], fit.loadings[best.factor])),
    });
  }
  return report;
}

function faRecoversPathways(run: GeneratorRun): CheckResult {
  const { thresholds } = run.config;
  const report = recoveryReport(run);
  const problems: string[] = [];
  for (const entry of report) {
    if (entry.factor !== entry.pathway) {
      problems.push(`P${entry.pathway} came back as factor ${entry.factor}, not in the authored order`);
    }
    if (!(entry.scoreR >= thresholds.faScoreRecoveryMin)) {
      problems.push(`P${entry.pathway} scores r ${entry.scoreR.toFixed(3)} < ${thresholds.faScoreRecoveryMin}`);
    }
    if (!(entry.loadingCosine >= thresholds.faLoadingRecoveryMin)) {
      problems.push(
        `P${entry.pathway} loadings cos ${entry.loadingCosine.toFixed(3)} < ${thresholds.faLoadingRecoveryMin}`,
      );
    }
  }
  const summary = report
    .map(e => `P${e.pathway}->F${e.factor} r ${e.scoreR.toFixed(3)} cos ${e.loadingCosine.toFixed(3)}`)
    .join(", ");
  return {
    name: "fa-recovers-pathways",
    passed: problems.length === 0,
    detail: problems.length === 0
      ? `${summary} (minimums r ${thresholds.faScoreRecoveryMin}, cos ${thresholds.faLoadingRecoveryMin})`
      : `${problems.join("; ")}. Recovered: ${summary}`,
  };
}

export function runChecks(run: GeneratorRun): CheckResult[] {
  return [
    shapAdditivity(run),
    noteEvidence(run),
    achievedCorrelations(run),
    wordCoverage(run),
    truthIsUnbiased(run),
    biasIsDetectable(run),
    decoysAreDecoys(run),
    pathwaysAreOrthogonal(run),
    faRecoversPathways(run),
  ];
}

export function checksPassed(results: CheckResult[]): boolean {
  return results.every(result => result.passed);
}
