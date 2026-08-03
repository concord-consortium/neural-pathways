import { pearson } from "../../src/explorer/utils/statistics";
import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export const TARGET_LABELS: Record<number, string> = { 1: "approach", 0: "wait" };

export interface OutcomeSummary {
  errorRateWhenBiasOn: number;
  errorRateWhenBiasOff: number;
  overallErrorRate: number;
  shareOfErrorsWhenBiasOn: number;
  corrCorrectWithBias: number;
  corrTargetWithBias: number;
  positiveTargetRate: number;
}

export interface Outcomes {
  target: number[];
  targetLabel: string[];
  classification: number[];
  classificationProbability: number[];
  /** 1 where the classification matched the target, 0 where it did not. */
  modelCorrect: number[];
  /** Solved noise scale on the truth. */
  sigmaTarget: number;
  /** Solved coefficient on the bias attribute. Negative. */
  beta: number;
  achieved: OutcomeSummary;
}

const BISECTION_ROUNDS = 60;
const MAX_SIGMA = 5;
const MIN_BETA = -5;

function errorRateOver(
  indices: number[], truth: number[], predicted: number[],
): number {
  if (indices.length === 0) return 0;
  let errors = 0;
  for (const i of indices) if (truth[i] !== predicted[i]) errors++;
  return errors / indices.length;
}

export function solveOutcomes(
  scores: number[][],
  solvedAttributes: SolvedAttribute[],
  config: AlienConfig,
  rng: Rng,
): Outcomes {
  const bias = solvedAttributes.find(attribute => attribute.key === config.biasAttributeKey);
  if (!bias) {
    throw new Error(`Bias attribute "${config.biasAttributeKey}" was not solved`);
  }
  const biasValues = bias.values;
  const truthScore = scores.map(row => row[config.truthPathway]);
  const n = truthScore.length;

  // Drawn once, then only rescaled by sigma, so both bisections are deterministic.
  const noise: number[] = [];
  for (let i = 0; i < n; i++) noise.push(rng.normal());

  const targetAt = (sigma: number): number[] =>
    truthScore.map((z, i) => (z + sigma * noise[i] > 0 ? 1 : 0));
  const classificationAt = (bCoeff: number): number[] =>
    truthScore.map((z, i) => (z + bCoeff * biasValues[i] > 0 ? 1 : 0));

  const offIndices: number[] = [];
  const onIndices: number[] = [];
  for (let i = 0; i < n; i++) (biasValues[i] === 1 ? onIndices : offIndices).push(i);
  if (onIndices.length === 0 || offIndices.length === 0) {
    throw new Error(`Bias attribute "${bias.key}" takes only one value; nothing to bias`);
  }

  // Step 1: sigma against the unbiased group, where beta cannot matter. More
  // noise on the truth means more disagreement with the model, so the error rate
  // rises monotonically with sigma.
  let sigmaLow = 0;
  let sigmaHigh = MAX_SIGMA;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (sigmaLow + sigmaHigh) / 2;
    const rate = errorRateOver(offIndices, targetAt(middle), classificationAt(0));
    if (rate < config.errorRateWhenBiasOff) sigmaLow = middle;
    else sigmaHigh = middle;
  }
  const sigmaTarget = (sigmaLow + sigmaHigh) / 2;
  const target = targetAt(sigmaTarget);

  // Step 2: beta against the biased group. beta runs negative, and the further
  // it goes the more items the model wrongly calls "wait", so the error rate
  // rises as beta falls.
  let betaLow = MIN_BETA;
  let betaHigh = 0;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (betaLow + betaHigh) / 2;
    const rate = errorRateOver(onIndices, target, classificationAt(middle));
    if (rate < config.errorRateWhenBiasOn) betaHigh = middle;
    else betaLow = middle;
  }
  const beta = (betaLow + betaHigh) / 2;

  const classification = classificationAt(beta);
  const classificationProbability = truthScore.map((z, i) => {
    const logit = config.logitScale * (z + beta * biasValues[i]);
    return 1 / (1 + Math.exp(-logit));
  });
  const modelCorrect = target.map((value, i) => (value === classification[i] ? 1 : 0));

  const errorRateWhenBiasOn = errorRateOver(onIndices, target, classification);
  const errorRateWhenBiasOff = errorRateOver(offIndices, target, classification);
  const totalErrors = modelCorrect.filter(value => value === 0).length;
  const errorsWhenBiasOn = onIndices.filter(i => modelCorrect[i] === 0).length;

  return {
    target,
    targetLabel: target.map(value => TARGET_LABELS[value]),
    classification,
    classificationProbability,
    modelCorrect,
    sigmaTarget,
    beta,
    achieved: {
      errorRateWhenBiasOn,
      errorRateWhenBiasOff,
      overallErrorRate: totalErrors / n,
      shareOfErrorsWhenBiasOn: totalErrors === 0 ? 0 : errorsWhenBiasOn / totalErrors,
      corrCorrectWithBias: pearson(modelCorrect, biasValues).r ?? 0,
      corrTargetWithBias: pearson(target, biasValues).r ?? 0,
      positiveTargetRate: target.reduce((sum, value) => sum + value, 0) / n,
    },
  };
}
