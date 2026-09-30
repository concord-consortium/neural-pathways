import { invert, symmetricEigen } from "./linear-algebra";

/**
 * A port of scikit-learn's FactorAnalysis (the SVD-based EM of Barber 21.2),
 * which is what the NNMaker pipeline used on the yelp activations. It is
 * written against the covariance matrix rather than the data matrix because
 * the eigen-solver is only 14x14 here. Constants are scikit-learn's defaults so
 * a fit is comparable to the pipeline's.
 */
export interface FactorAnalysisFit {
  /** factorCount x variableCount, in scikit-learn's order: descending noise-weighted variance. */
  loadings: number[][];
  noiseVariance: number[];
  mean: number[];
  /** Summed squared loadings over the variable count, per factor. */
  explainedVariancePerFactor: number[];
  explainedVarianceTotal: number;
  iterations: number;
  converged: boolean;
}

export interface FactorAnalysisOptions {
  /** Stop when the log-likelihood gains less than this. */
  tolerance?: number;
  maxIterations?: number;
}

const DEFAULT_TOLERANCE = 1e-2;
const DEFAULT_MAX_ITERATIONS = 1000;
const NOISE_FLOOR = 1e-12;

export function columnMeans(x: number[][]): number[] {
  return x[0].map((_, j) => x.reduce((sum, row) => sum + row[j], 0) / x.length);
}

/** Population covariance (divides by n, as scikit-learn's SVD route effectively does). */
function covariance(x: number[][], mean: number[]): number[][] {
  const n = x.length;
  const p = mean.length;
  const cov = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (const row of x) {
    for (let i = 0; i < p; i++) {
      const di = row[i] - mean[i];
      for (let j = i; j < p; j++) cov[i][j] += di * (row[j] - mean[j]);
    }
  }
  for (let i = 0; i < p; i++) {
    for (let j = i; j < p; j++) {
      cov[i][j] /= n;
      cov[j][i] = cov[i][j];
    }
  }
  return cov;
}

export function fitFactorAnalysis(
  x: number[][],
  factorCount: number,
  options: FactorAnalysisOptions = {},
): FactorAnalysisFit {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const n = x.length;
  const p = x[0].length;
  if (factorCount < 1 || factorCount > p) {
    throw new Error(`fitFactorAnalysis: ${factorCount} factors for ${p} variables`);
  }

  const mean = columnMeans(x);
  const cov = covariance(x, mean);
  const variance = cov.map((row, i) => row[i]);
  const llConstant = p * Math.log(2 * Math.PI) + factorCount;

  let psi = new Array<number>(p).fill(1);
  let loadings: number[][] = [];
  let previousLogLikelihood = -Infinity;
  let iterations = 0;
  let converged = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    iterations = iteration + 1;
    const sqrtPsi = psi.map(value => Math.sqrt(value) + NOISE_FLOOR);
    const whitened = cov.map((row, i) => row.map((value, j) => value / (sqrtPsi[i] * sqrtPsi[j])));
    const { values, vectors } = symmetricEigen(whitened);
    const top = values.slice(0, factorCount);
    const unexplained = values.slice(factorCount).reduce((sum, value) => sum + value, 0);

    loadings = top.map((lambda, q) =>
      vectors[q].map((value, j) => Math.sqrt(Math.max(lambda - 1, 0)) * value * sqrtPsi[j]));

    let logLikelihood = llConstant
      + top.reduce((sum, value) => sum + Math.log(value), 0)
      + unexplained
      + psi.reduce((sum, value) => sum + Math.log(value), 0);
    logLikelihood *= -n / 2;

    if (logLikelihood - previousLogLikelihood < tolerance) {
      converged = true;
      break;
    }
    previousLogLikelihood = logLikelihood;
    psi = variance.map((value, j) =>
      Math.max(value - loadings.reduce((sum, row) => sum + row[j] * row[j], 0), NOISE_FLOOR));
  }

  const explainedVariancePerFactor = loadings.map(row =>
    row.reduce((sum, value) => sum + value * value, 0) / p);
  return {
    loadings,
    noiseVariance: psi,
    mean,
    explainedVariancePerFactor,
    explainedVarianceTotal: explainedVariancePerFactor.reduce((sum, value) => sum + value, 0),
    iterations,
    converged,
  };
}

/** scikit-learn's transform: z = (x - mean) Psi^-1 W^T (I + W Psi^-1 W^T)^-1. */
export function factorScores(x: number[][], fit: FactorAnalysisFit): number[][] {
  const k = fit.loadings.length;
  const weighted = fit.loadings.map(row => row.map((value, j) => value / fit.noiseVariance[j]));
  const gram = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (__, b) =>
    (a === b ? 1 : 0) + weighted[a].reduce((sum, value, j) => sum + value * fit.loadings[b][j], 0)));
  const posterior = invert(gram);

  return x.map(row => {
    const centered = row.map((value, j) => value - fit.mean[j]);
    const projected = weighted.map(w => w.reduce((sum, value, j) => sum + value * centered[j], 0));
    return posterior.map((_, b) => projected.reduce((sum, value, a) => sum + value * posterior[a][b], 0));
  });
}
