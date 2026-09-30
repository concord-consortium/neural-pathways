/**
 * Dense linear algebra for matrices no larger than the neuron count (14) on
 * one side and the pathway count on the other. Nothing here is tuned for
 * size; it is tuned for having no dependency and being readable.
 */
export type Matrix = number[][];

const JACOBI_SWEEPS = 100;
const OFF_DIAGONAL_TOLERANCE = 1e-22;
const PIVOT_TOLERANCE = 1e-300;

export interface EigenDecomposition {
  /** Descending. */
  values: number[];
  /** vectors[i] is the unit eigenvector belonging to values[i]. */
  vectors: number[][];
}

export function identity(size: number): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (__, j) => (i === j ? 1 : 0)));
}

export function transpose(m: Matrix): Matrix {
  return m[0].map((_, j) => m.map(row => row[j]));
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  if (a[0].length !== b.length) {
    throw new Error(`multiply: ${a[0].length} columns against ${b.length} rows`);
  }
  return a.map(row => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
}

/**
 * Cyclic Jacobi rotations. Each rotation zeroes one off-diagonal pair; sweeps
 * repeat until the off-diagonal energy is negligible. Quadratically convergent
 * for symmetric input, and exact enough that eigenvectors come back orthonormal
 * to ~1e-12, which is what the loading solver relies on.
 */
export function symmetricEigen(matrix: Matrix): EigenDecomposition {
  const n = matrix.length;
  const a = matrix.map(row => [...row]);
  const v = identity(n);

  for (let sweep = 0; sweep < JACOBI_SWEEPS; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < OFF_DIAGONAL_TOLERANCE) break;

    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < PIVOT_TOLERANCE) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }

  const order = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
  return {
    values: order.map(i => a[i][i]),
    vectors: order.map(i => v.map(row => row[i])),
  };
}

/** Gauss-Jordan elimination with partial pivoting. */
export function invert(matrix: Matrix): Matrix {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...identity(n)[i]]);

  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    }
    if (Math.abs(a[pivot][column]) < PIVOT_TOLERANCE) {
      throw new Error("invert: matrix is singular");
    }
    [a[column], a[pivot]] = [a[pivot], a[column]];

    const divisor = a[column][column];
    for (let j = 0; j < 2 * n; j++) a[column][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = a[row][column];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[row][j] -= factor * a[column][j];
    }
  }

  return a.map(row => row.slice(n));
}

/** V diag(1/sqrt(lambda)) V^T. The input must be symmetric positive-definite. */
export function inverseSqrt(matrix: Matrix): Matrix {
  const { values, vectors } = symmetricEigen(matrix);
  if (values.some(value => !(value > 0))) {
    throw new Error("inverseSqrt: matrix is not positive-definite");
  }
  const n = matrix.length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) =>
    values.reduce((sum, lambda, k) => sum + vectors[k][i] * vectors[k][j] / Math.sqrt(lambda), 0)));
}
