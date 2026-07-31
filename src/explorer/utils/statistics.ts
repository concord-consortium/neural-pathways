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

/**
 * Determines whether a value is a usable observation: not null, not NaN, and not infinite.
 * This is the module's single definition of a usable observation, used consistently
 * across all statistics functions to ensure predictable filtering behavior.
 */
export function isUsable(value: number | null): value is number {
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

export interface GroupSummary {
  value: number;
  n: number;
  mean: number;
  sd: number;
  /** Counts per bin, aligned with the shared binEdges. */
  counts: number[];
}

export interface GroupComparison {
  groups: GroupSummary[];
  /** binEdges.length === counts.length + 1 */
  binEdges: number[];
  /** |meanA - meanB| / pooled SD, or null when it cannot be computed. */
  separationSd: number | null;
}

const DEFAULT_BIN_COUNT = 20;

function binIndex(value: number, min: number, max: number, binCount: number): number {
  if (max === min) return 0;
  const raw = Math.floor(((value - min) / (max - min)) * binCount);
  return Math.min(Math.max(raw, 0), binCount - 1);
}

/**
 * Splits scores by the distinct values of groupValues and summarises each group.
 * Bin edges are computed once across the pooled scores so the histograms are
 * directly comparable. Pairs where either input is null are skipped.
 *
 * separationSd is only defined for exactly two groups — it is the difference in
 * means over the pooled standard deviation.
 */
export function compareGroups(
  groupValues: (number | null)[],
  scores: (number | null)[],
  binCount: number = DEFAULT_BIN_COUNT,
): GroupComparison {
  if (groupValues.length !== scores.length) {
    throw new Error(`compareGroups: length mismatch (${groupValues.length} vs ${scores.length})`);
  }

  const buckets = new Map<number, number[]>();
  const pooled: number[] = [];
  for (let i = 0; i < groupValues.length; i++) {
    const g = groupValues[i];
    const s = scores[i];
    if (!isUsable(g) || !isUsable(s)) continue;
    if (!buckets.has(g)) buckets.set(g, []);
    (buckets.get(g) as number[]).push(s);
    pooled.push(s);
  }

  if (pooled.length === 0) {
    return { groups: [], binEdges: [], separationSd: null };
  }

  const min = Math.min(...pooled);
  const max = Math.max(...pooled);
  const binEdges: number[] = [];
  for (let i = 0; i <= binCount; i++) {
    binEdges.push(min + ((max - min) * i) / binCount);
  }

  const groups: GroupSummary[] = [...buckets.keys()].sort((a, b) => a - b).map(value => {
    const values = buckets.get(value) as number[];
    const counts = new Array<number>(binCount).fill(0);
    for (const v of values) {
      counts[binIndex(v, min, max, binCount)]++;
    }
    return {
      value,
      n: values.length,
      mean: mean(values),
      sd: values.length < 2 ? 0 : standardDeviation(values),
      counts,
    };
  });

  let separationSd: number | null = null;
  if (groups.length === 2) {
    const [a, b] = groups;
    const pooledVariance = ((a.n - 1) * a.sd * a.sd + (b.n - 1) * b.sd * b.sd)
      / (a.n + b.n - 2);
    const pooledSd = Math.sqrt(pooledVariance);
    if (Number.isFinite(pooledSd) && pooledSd > 0) {
      separationSd = Math.abs(a.mean - b.mean) / pooledSd;
    }
  }

  return { groups, binEdges, separationSd };
}

export interface LinearFit {
  slope: number;
  intercept: number;
}

/**
 * Ordinary least-squares fit of y on x over pairwise-complete observations.
 * Returns null when the fit is undefined — fewer than two complete pairs, or
 * zero variance in x.
 */
export function linearFit(xs: (number | null)[], ys: (number | null)[]): LinearFit | null {
  if (xs.length !== ys.length) {
    throw new Error(`linearFit: length mismatch (${xs.length} vs ${ys.length})`);
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < xs.length; i++) {
    if (!isUsable(xs[i]) || !isUsable(ys[i])) continue;
    pairs.push([xs[i] as number, ys[i] as number]);
  }

  if (pairs.length < 2) return null;

  const meanX = mean(pairs.map(p => p[0]));
  const meanY = mean(pairs.map(p => p[1]));

  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    sxx += dx * dx;
    sxy += dx * (y - meanY);
  }

  if (sxx === 0) return null;

  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX };
}
