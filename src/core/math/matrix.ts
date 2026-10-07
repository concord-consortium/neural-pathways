/**
 * Threshold below which a pivot counts as zero. For the OLS correlation matrix in
 * multipleRegression, entries are O(1) by construction, so an absolute tolerance is
 * appropriate. logisticRegression's XtWX is a weighted cross-product of standardized
 * columns whose entries scale with n, so the same claim does not hold there — but no
 * failure from that has been observed in practice: pivots stay around 1e-3 even with
 * IRLS weights pinned at their floor.
 */
const PIVOT_TOLERANCE = 1e-10;

function isSquare(m: number[][]): boolean {
  return m.length > 0 && m.every(row => row.length === m.length);
}

/**
 * Gauss-Jordan inversion with partial pivoting.
 *
 * Returns null rather than throwing when the matrix is singular: a singular
 * predictor matrix means the attributes are linearly dependent, which is an
 * ordinary state in this app, not an exceptional one.
 */
export function invertSymmetric(m: number[][]): number[][] | null {
  if (!isSquare(m)) return null;
  const n = m.length;

  // Augment a copy of m with the identity, so no caller's array is mutated.
  const work = m.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(work[row][col]) > Math.abs(work[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(work[pivotRow][col]) < PIVOT_TOLERANCE) return null;

    if (pivotRow !== col) {
      const swap = work[pivotRow];
      work[pivotRow] = work[col];
      work[col] = swap;
    }

    const pivot = work[col][col];
    for (let j = 0; j < 2 * n; j++) work[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = work[row][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) work[row][j] -= factor * work[col][j];
    }
  }

  return work.map(row => row.slice(n));
}

/** Solves m x = rhs. Returns null when m is singular or the sizes disagree. */
export function solveSymmetric(m: number[][], rhs: number[]): number[] | null {
  if (!isSquare(m) || rhs.length !== m.length) return null;
  const inverse = invertSymmetric(m);
  if (!inverse) return null;
  return inverse.map(row => row.reduce((sum, v, j) => sum + v * rhs[j], 0));
}
