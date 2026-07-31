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
  /** Counts per bin, aligned with the shared bins. */
  counts: number[];
}

/**
 * How a column's values were divided into bars.
 *
 * A discriminated union rather than two optional fields, so a consumer cannot
 * read bin edges from a categorical comparison — the two modes have genuinely
 * different meanings and the type should say so.
 */
export type Bins =
  /** One bar per distinct value, ascending. values.length === counts.length. */
  | { mode: "categorical"; values: number[] }
  /** Equal-width bins. edges.length === counts.length + 1. */
  | { mode: "numeric"; edges: number[] };

export interface GroupComparison {
  groups: GroupSummary[];
  bins: Bins;
  /** |meanA - meanB| / pooled SD, or null when it cannot be computed. */
  separationSd: number | null;
}

/**
 * Upper bound on the distinct column values that categorical mode will render,
 * one bar per value rather than equal-width bins. Binning discrete data on a
 * continuous scale leaves empty bins between the occupied ones, and those gaps
 * carry no information.
 *
 * Set to match DEFAULT_BIN_COUNT so categorical mode never renders more bars
 * than numeric mode would have.
 *
 * This is only the first of two conditions — see compareGroups. Being under the
 * limit is necessary for categorical mode but not sufficient; the values must
 * also repeat.
 */
export const MAX_DISTINCT_FOR_BARS = 20;

const DEFAULT_BIN_COUNT = 20;

function binIndex(value: number, min: number, max: number, binCount: number): number {
  if (max === min) return 0;
  const raw = Math.floor(((value - min) / (max - min)) * binCount);
  return Math.min(Math.max(raw, 0), binCount - 1);
}

/**
 * Splits scores by the distinct values of groupValues and summarises each group.
 * Bins are derived once from the pooled scores so the histograms are directly
 * comparable — bar i means the same thing in every group. A column whose few
 * distinct values repeat gets one bar per value; anything else gets equal-width
 * bins.
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
    return { groups: [], bins: { mode: "numeric", edges: [] }, separationSd: null };
  }

  const distinct = [...new Set(pooled)].sort((a, b) => a - b);
  // Few distinct values is not by itself evidence that a column is discrete — a
  // continuous column looks discrete when the filter is narrow enough. Fifteen
  // reviews of a continuous pathway score have fifteen distinct values, and
  // charting those as evenly spaced bars misrepresents them as categories.
  // Genuine discreteness shows up as REPETITION, so also require each distinct
  // value to appear at least twice on average. A single distinct value is always
  // categorical, because there is no spread to bin.
  const categorical = distinct.length === 1
    || (distinct.length <= MAX_DISTINCT_FOR_BARS && distinct.length * 2 <= pooled.length);

  let bins: Bins;
  let barCount: number;
  let indexOf: (value: number) => number;

  if (categorical) {
    const position = new Map<number, number>();
    distinct.forEach((value, i) => position.set(value, i));
    bins = { mode: "categorical", values: distinct };
    barCount = distinct.length;
    indexOf = value => position.get(value) as number;
  } else {
    const min = distinct[0];
    const max = distinct[distinct.length - 1];
    const edges: number[] = [];
    for (let i = 0; i <= binCount; i++) {
      edges.push(min + ((max - min) * i) / binCount);
    }
    bins = { mode: "numeric", edges };
    barCount = binCount;
    indexOf = value => binIndex(value, min, max, binCount);
  }

  const groups: GroupSummary[] = [...buckets.keys()].sort((a, b) => a - b).map(value => {
    const values = buckets.get(value) as number[];
    const counts = new Array<number>(barCount).fill(0);
    for (const v of values) {
      counts[indexOf(v)]++;
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

  return { groups, bins, separationSd };
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
