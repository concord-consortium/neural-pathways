import { ActivationConfig, AlienConfig } from "./config-types";
import { inverseSqrt, multiply } from "./linear-algebra";
import { Rng } from "./rng";

export interface Activations {
  /** pathwayCount x neuronCount. */
  loadings: number[][];
  /** Per neuron; each neuron's communality is exactly 1 - noiseVariance. */
  noiseVariance: number[];
  scalerMean: number[];
  scalerScale: number[];
  /** [conversation][neuron], the values factor analysis sees. */
  standardized: number[][];
  /** [conversation][neuron], standardized x scale + mean. */
  raw: number[][];
  /** Per conversation, the NNMaker definition. */
  reconstructionR2: number[];
}

const SOLVER_TOLERANCE = 1e-10;
const SOLVER_MAX_ITERATIONS = 5000;

function uniform(range: [number, number], rng: Rng): number {
  return range[0] + (range[1] - range[0]) * rng.next();
}

/**
 * Per-neuron noise variance, drawn first and then rescaled so the mean is
 * exactly 1 - explainedVarianceTotal. Because the activations are standardized,
 * a neuron's communality is 1 - its noise variance, so this draw also fixes how
 * much of every neuron the pathways must explain. That total then equals the sum
 * of the target row energies, which is what makes the solver's constraints
 * consistent.
 */
export function drawNoiseVariances(config: ActivationConfig, rng: Rng): number[] {
  const draws = Array.from({ length: config.neuronCount }, () => uniform(config.noiseVarianceRange, rng));
  const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
  return draws.map(value => value * (1 - config.explainedVarianceTotal) / mean);
}

/** Standard-normal entries. Only seeds the solver; nothing about it survives exactly. */
export function drawSketch(pathwayCount: number, neuronCount: number, rng: Rng): number[][] {
  return Array.from({ length: pathwayCount }, () =>
    Array.from({ length: neuronCount }, () => rng.normal()));
}

/**
 * Finds loadings L with L Psi^-1 L^T diagonal, row p carrying energy
 * energies[p], and neuron j carrying communality 1 - noiseVariance[j]. That is
 * the canonical form scikit-learn's FactorAnalysis returns, so factor analysis
 * over activations built from L hands L back unrotated, up to row signs.
 *
 * It works on M = L Psi^-1/2, where the three constraints read: rows of M
 * orthogonal; sum_j M[p][j]^2 psi[j] = energies[p]; sum_p M[p][j]^2 psi[j] =
 * 1 - psi[j]. Alternating projections: symmetric (Lowdin) orthogonalization of
 * the rows, then row rescaling, then column rescaling, until nothing moves. A
 * probe converged in 50-100 iterations for every configuration tried.
 */
export function solveLoadings(
  sketch: number[][],
  energies: number[],
  noiseVariance: number[],
): { loadings: number[][]; iterations: number } {
  const psi = noiseVariance;
  const neuronCount = psi.length;
  const communality = psi.map(value => 1 - value);
  let m = sketch.map(row => row.map((value, j) => value / Math.sqrt(psi[j])));

  const rowEnergy = (row: number[]) => row.reduce((sum, value, j) => sum + value * value * psi[j], 0);
  const columnEnergy = (matrix: number[][], j: number) =>
    matrix.reduce((sum, row) => sum + row[j] * row[j] * psi[j], 0);

  for (let iteration = 1; iteration <= SOLVER_MAX_ITERATIONS; iteration++) {
    const gram = m.map(a => m.map(b => a.reduce((sum, value, j) => sum + value * b[j], 0)));
    const orthogonal = multiply(inverseSqrt(gram), m);
    const rowScaled = orthogonal.map((row, p) => {
      const factor = Math.sqrt(energies[p] / rowEnergy(row));
      return row.map(value => value * factor);
    });
    const columnFactors = Array.from({ length: neuronCount }, (_, j) =>
      Math.sqrt(communality[j] / columnEnergy(rowScaled, j)));
    const next = rowScaled.map(row => row.map((value, j) => value * columnFactors[j]));

    let change = 0;
    next.forEach((row, p) => row.forEach((value, j) => {
      change = Math.max(change, Math.abs(value - m[p][j]));
    }));
    m = next;
    if (change < SOLVER_TOLERANCE) {
      return { loadings: m.map(row => row.map((value, j) => value * Math.sqrt(psi[j]))), iterations: iteration };
    }
  }
  throw new Error(
    `solveLoadings did not converge in ${SOLVER_MAX_ITERATIONS} iterations; the noise variance `
    + `range or the variance split may be infeasible for this neuron count`,
  );
}

/**
 * 1 - mean((x - x_hat)^2) / var(x), both over the item's own neurons: the
 * NNMaker definition, and the same arithmetic the heatmap app performs.
 */
export function reconstructionR2(standardized: number[], reconstructed: number[]): number {
  const n = standardized.length;
  const mean = standardized.reduce((sum, value) => sum + value, 0) / n;
  let residual = 0;
  let total = 0;
  for (let j = 0; j < n; j++) {
    residual += (standardized[j] - reconstructed[j]) ** 2;
    total += (standardized[j] - mean) ** 2;
  }
  return 1 - residual / total;
}

/**
 * The RNG is consumed in this order: noise variances, sketch, scaler means,
 * scaler scales, then noise item by item and neuron by neuron. Reordering
 * changes every activation for a given seed.
 */
export function buildActivations(scores: number[][], config: AlienConfig, rng: Rng): Activations {
  const { neuronCount, explainedVarianceTotal } = config.activations;
  const noiseVariance = drawNoiseVariances(config.activations, rng);
  const sketch = drawSketch(config.pathwayCount, neuronCount, rng);
  const energies = config.targetVarianceShares.map(share => share * explainedVarianceTotal * neuronCount);
  const { loadings } = solveLoadings(sketch, energies, noiseVariance);

  const scalerMean = Array.from({ length: neuronCount }, () => uniform(config.activations.scalerMeanRange, rng));
  const scalerScale = Array.from({ length: neuronCount }, () => uniform(config.activations.scalerScaleRange, rng));

  const standardized: number[][] = [];
  const raw: number[][] = [];
  const r2: number[] = [];
  for (const row of scores) {
    const reconstructed = Array.from({ length: neuronCount }, (_, j) =>
      loadings.reduce((sum, loading, p) => sum + row[p] * loading[j], 0));
    const item = reconstructed.map((value, j) => value + rng.normal() * Math.sqrt(noiseVariance[j]));
    standardized.push(item);
    raw.push(item.map((value, j) => value * scalerScale[j] + scalerMean[j]));
    r2.push(reconstructionR2(item, reconstructed));
  }

  return { loadings, noiseVariance, scalerMean, scalerScale, standardized, raw, reconstructionR2: r2 };
}
