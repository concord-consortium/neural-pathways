export interface CorrelationResult {
  /** Pearson correlation, or null when it is undefined for this pair. */
  r: number | null;
  /** Number of complete pairs the correlation was computed from. */
  n: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/** Sample standard deviation (n - 1 denominator). */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return NaN;
  const m = mean(values);
  let sumSquares = 0;
  for (const value of values) {
    const d = value - m;
    sumSquares += d * d;
  }
  return Math.sqrt(sumSquares / (values.length - 1));
}

function isUsable(value: number | null): value is number {
  return value != null && Number.isFinite(value);
}

/**
 * Pearson correlation over pairwise-complete observations: any index where
 * either series is null, NaN, or infinite is skipped entirely.
 *
 * Returns r: null — distinct from r: 0 — when the correlation is undefined,
 * which happens with fewer than 3 complete pairs or zero variance in either
 * series. Callers must render those two cases differently.
 *
 * For a binary series this is the point-biserial correlation; no separate
 * function is needed.
 */
export function pearson(
  xs: (number | null)[],
  ys: (number | null)[],
): CorrelationResult {
  if (xs.length !== ys.length) {
    throw new Error(`pearson: length mismatch (${xs.length} vs ${ys.length})`);
  }

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!isUsable(xs[i]) || !isUsable(ys[i])) continue;
    n++;
    sumX += xs[i] as number;
    sumY += ys[i] as number;
  }

  if (n < 3) return { r: null, n };

  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    if (!isUsable(xs[i]) || !isUsable(ys[i])) continue;
    const dx = (xs[i] as number) - meanX;
    const dy = (ys[i] as number) - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0 || syy === 0) return { r: null, n };

  return { r: sxy / Math.sqrt(sxx * syy), n };
}
