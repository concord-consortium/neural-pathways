import { Network } from "./network";
import { ForwardPass } from "./forward";

/** The two cut points between the thin, mid and thick bands. */
export type BandThresholds = readonly [number, number];

/** 0 thin, 1 mid, 2 thick. */
export type MagnitudeBand = 0 | 1 | 2;

/**
 * What the network diagram draws against, computed once over a set of passes (all 800 alien3
 * conversations in Trace a Case) so a width or a gauge means the same thing from case to case.
 */
export interface NetworkScales {
  /**
   * One pair per drawn gap: layer 0 → 1, 1 → 2, and so on. Each is the tercile cut points of that
   * gap's pooled |source activation| and |source activation × weight| over every pass. Both
   * halves of an edge are banded on the same scale, so "thinner after the weight" reads true.
   */
  edgeThresholds: BandThresholds[];
  /** The largest |logit| over the passes. An output node draws logit / logitScale. */
  logitScale: number;
}

export function networkScales(network: Network, passes: readonly ForwardPass[]): NetworkScales {
  const gapCount = network.layers.length - 1;
  const pools: number[][] = Array.from({ length: gapCount }, () => []);
  let logitScale = 0;
  for (const pass of passes) {
    for (let gap = 0; gap < gapCount; gap++) {
      const source = pass.layers[gap];
      const weights = network.layers[gap + 1].weights;
      for (let i = 0; i < source.length; i++) {
        pools[gap].push(Math.abs(source[i]));
        for (const row of weights) {
          pools[gap].push(Math.abs(source[i] * row[i]));
        }
      }
    }
    for (const logit of pass.layers[pass.layers.length - 1]) {
      logitScale = Math.max(logitScale, Math.abs(logit));
    }
  }
  return {
    edgeThresholds: pools.map(terciles),
    logitScale: logitScale || 1,
  };
}

function terciles(pool: number[]): BandThresholds {
  if (pool.length === 0) {
    return [0, 0];
  }
  const sorted = [...pool].sort((a, b) => a - b);
  return [sorted[Math.floor(sorted.length / 3)], sorted[Math.floor((2 * sorted.length) / 3)]];
}

export function magnitudeBand(value: number, [low, high]: BandThresholds): MagnitudeBand {
  const magnitude = Math.abs(value);
  return magnitude < low ? 0 : magnitude < high ? 1 : 2;
}
