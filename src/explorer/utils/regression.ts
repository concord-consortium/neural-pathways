import { mean, standardDeviation } from "./statistics";
import { invertSymmetric, solveSymmetric } from "./matrix";

export interface TermResult {
  label: string;
  /** Standardized coefficient. */
  beta: number;
  /** Partial correlation with the target, controlling for every other term. */
  partialR: number;
}

export interface OlsResult {
  kind: "ols";
  rSquared: number;
  terms: TermResult[];
  n: number;
  df: number;
}

export interface LogisticTerm {
  label: string;
  /** Log-odds change per one standard deviation of the predictor. */
  coefficient: number;
}

export interface LogisticResult {
  kind: "logistic";
  terms: LogisticTerm[];
  accuracy: number;
  baselineAccuracy: number;
  converged: boolean;
  n: number;
}

const MAX_IRLS_ITERATIONS = 25;
const IRLS_TOLERANCE = 1e-8;
const MIN_IRLS_WEIGHT = 1e-6;
/** Residual variance at or below this counts as an exact fit. */
const PERFECT_FIT_TOLERANCE = 1e-12;
/**
 * How far above 1 a raw R^2 may land before it is treated as broken rather than
 * rounding noise. Rounding from an ill-conditioned but accepted correlation matrix
 * stays within this band; anything further out means the fit itself is unreliable.
 */
const R_SQUARED_OVERAGE_TOLERANCE = 1e-6;

function columnOf(matrix: number[][], index: number): number[] {
  return matrix.map(row => row[index]);
}

/** Returns z-scored columns, or null when any column has zero variance. */
function standardizeColumns(X: number[][]): number[][] | null {
  if (X.length === 0 || X[0].length === 0) return null;
  const k = X[0].length;
  const means: number[] = [];
  const sds: number[] = [];
  for (let j = 0; j < k; j++) {
    const column = columnOf(X, j);
    const sd = standardDeviation(column);
    if (!Number.isFinite(sd) || sd === 0) return null;
    means.push(mean(column));
    sds.push(sd);
  }
  return X.map(row => row.map((value, j) => (value - means[j]) / sds[j]));
}

/**
 * Ordinary least squares computed from the predictor correlation matrix, which
 * keeps every quantity O(1) and yields standardized coefficients directly.
 *
 * Returns null when the fit is undefined: fewer rows than terms plus two, a
 * constant target or predictor, or a singular predictor correlation matrix.
 */
export function multipleRegression(X: number[][], y: number[]): OlsResult | null {
  const n = y.length;
  if (X.length !== n || n === 0 || X[0].length === 0) return null;

  const k = X[0].length;
  const df = n - k - 1;
  if (df < 1) return null;

  const targetSd = standardDeviation(y);
  if (!Number.isFinite(targetSd) || targetSd === 0) return null;
  const targetMean = mean(y);
  const z = y.map(value => (value - targetMean) / targetSd);

  const standardized = standardizeColumns(X);
  if (!standardized) return null;

  // Correlation matrix of predictors, and predictor-target correlations.
  const R: number[][] = [];
  for (let a = 0; a < k; a++) {
    const rowValues: number[] = [];
    for (let b = 0; b < k; b++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += standardized[i][a] * standardized[i][b];
      rowValues.push(sum / (n - 1));
    }
    R.push(rowValues);
  }

  const c: number[] = [];
  for (let a = 0; a < k; a++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += standardized[i][a] * z[i];
    c.push(sum / (n - 1));
  }

  const rInverse = invertSymmetric(R);
  if (!rInverse) return null;

  const beta = rInverse.map(row => row.reduce((sum, v, j) => sum + v * c[j], 0));
  const rawRSquared = beta.reduce((sum, b, j) => sum + b * c[j], 0);
  if (!Number.isFinite(rawRSquared)) return null;

  // Rounding can push R^2 a hair outside [0, 1], and a hair is absorbed by clamping
  // rather than rejected, since an exact fit is a legitimate result, not a failure.
  // But a correlation matrix that is ill-conditioned enough to squeak past
  // PIVOT_TOLERANCE without actually being invertible reliably can send beta, and
  // therefore rawRSquared, arbitrarily far past 1 — clamping that down to a
  // confident "R^2 = 1.000" would be the most misleading output this function could
  // produce, so anything past the rounding band is rejected instead.
  if (rawRSquared > 1 + R_SQUARED_OVERAGE_TOLERANCE) return null;
  const rSquared = Math.min(Math.max(rawRSquared, 0), 1);
  const residual = 1 - rSquared;

  const terms: TermResult[] = beta.map((b, j) => {
    // A perfect fit leaves no residual variance, so the standard error is zero
    // and the partial correlation saturates at +/-1. Computing it the usual way
    // would divide by zero and yield NaN.
    if (residual <= PERFECT_FIT_TOLERANCE) {
      return { label: `x${j}`, beta: b, partialR: b === 0 ? 0 : Math.sign(b) };
    }
    const se = Math.sqrt((residual / df) * rInverse[j][j]);
    const t = se > 0 ? b / se : 0;
    const partialR = t / Math.sqrt(t * t + df);
    return { label: `x${j}`, beta: b, partialR };
  });

  return { kind: "ols", rSquared, terms, n, df };
}

/**
 * Binary logistic regression by iteratively reweighted least squares, on
 * standardized predictors plus an intercept. Coefficients are therefore the
 * log-odds change per standard deviation, which makes them comparable across
 * predictors measured on different scales.
 *
 * Returns null when the target is not binary, is all one class, the design is
 * empty, or there are too few rows for the terms. Non-convergence is reported
 * through the converged flag rather than discarding the result.
 */
export function logisticRegression(X: number[][], y: number[]): LogisticResult | null {
  const n = y.length;
  if (X.length !== n || n === 0 || X[0].length === 0) return null;

  // Recode to {0, 1} rather than requiring it: the target only needs two distinct
  // values, not literal 0/1 (a filter like review_stars:[1 TO 2] yields {1, 2}). The
  // lower value becomes 0 and the higher becomes 1, and every downstream use of the
  // target — IRLS, accuracy, baseline accuracy — reads the recoded vector.
  const distinctValues = Array.from(new Set(y)).sort((a, b) => a - b);
  if (distinctValues.length !== 2) return null;
  const lowValue = distinctValues[0];
  const target = y.map(value => (value === lowValue ? 0 : 1));

  const k = X[0].length;
  if (n < k + 2) return null;

  const standardized = standardizeColumns(X);
  if (!standardized) return null;

  // Design with a leading intercept column.
  const design = standardized.map(row => [1, ...row]);
  const width = k + 1;
  let beta = new Array<number>(width).fill(0);
  let converged = false;

  for (let iteration = 0; iteration < MAX_IRLS_ITERATIONS; iteration++) {
    const w: number[] = [];
    const zTarget: number[] = [];
    for (let i = 0; i < n; i++) {
      let eta = 0;
      for (let j = 0; j < width; j++) eta += design[i][j] * beta[j];
      const prob = 1 / (1 + Math.exp(-eta));
      const weight = Math.max(prob * (1 - prob), MIN_IRLS_WEIGHT);
      w.push(weight);
      zTarget.push(eta + (target[i] - prob) / weight);
    }

    const xtwx: number[][] = [];
    for (let a = 0; a < width; a++) {
      const rowValues: number[] = [];
      for (let b = 0; b < width; b++) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += design[i][a] * w[i] * design[i][b];
        rowValues.push(sum);
      }
      xtwx.push(rowValues);
    }

    const xtwz: number[] = [];
    for (let a = 0; a < width; a++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += design[i][a] * w[i] * zTarget[i];
      xtwz.push(sum);
    }

    const next = solveSymmetric(xtwx, xtwz);
    if (!next) return null;

    let maxChange = 0;
    for (let j = 0; j < width; j++) {
      maxChange = Math.max(maxChange, Math.abs(next[j] - beta[j]));
    }
    beta = next;
    if (maxChange < IRLS_TOLERANCE) {
      converged = true;
      break;
    }
  }

  let correct = 0;
  for (let i = 0; i < n; i++) {
    let eta = 0;
    for (let j = 0; j < width; j++) eta += design[i][j] * beta[j];
    const predicted = eta >= 0 ? 1 : 0;
    if (predicted === target[i]) correct++;
  }

  const positiveRate = mean(target);
  const baselineAccuracy = Math.max(positiveRate, 1 - positiveRate);

  const terms: LogisticTerm[] = [];
  for (let j = 0; j < k; j++) {
    terms.push({ label: `x${j}`, coefficient: beta[j + 1] });
  }

  return {
    kind: "logistic",
    terms,
    accuracy: correct / n,
    baselineAccuracy,
    converged,
    n,
  };
}
