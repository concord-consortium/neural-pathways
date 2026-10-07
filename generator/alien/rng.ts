/* eslint-disable no-bitwise -- mulberry32 is defined in 32-bit integer arithmetic */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Standard normal, by the Box-Muller transform. */
  normal(): number;
  /** Uniform integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: T[]): T;
  /** Index i with probability proportional to weights[i]. Weights must be >= 0. */
  weightedIndex(weights: number[]): number;
}

/**
 * mulberry32. Chosen over a hand-rolled LCG because every step stays in 32-bit
 * integer space: an LCG written with `*` in JavaScript overflows the 2^53 float
 * mantissa and returns correlated garbage that looks random enough to ship.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (): number => {
    // Box-Muller needs u1 > 0; next() can return exactly 0.
    let u1 = next();
    while (u1 === 0) u1 = next();
    const u2 = next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const int = (minInclusive: number, maxInclusive: number): number =>
    minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));

  const pick = <T>(items: T[]): T => items[int(0, items.length - 1)];

  const weightedIndex = (weights: number[]): number => {
    let total = 0;
    for (const weight of weights) total += weight;
    if (!(total > 0)) {
      throw new Error("weightedIndex: weights must include at least one positive value");
    }
    let remaining = next() * total;
    for (let i = 0; i < weights.length; i++) {
      remaining -= weights[i];
      if (remaining < 0) return i;
    }
    return weights.length - 1;
  };

  return { next, normal, int, pick, weightedIndex };
}
/* eslint-enable no-bitwise */
