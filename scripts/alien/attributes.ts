import { pearson } from "../../src/explorer/utils/statistics";
import { AlienConfig, AttributeConfig } from "./config-types";
import { Rng } from "./rng";

export interface SolvedAttribute {
  key: string;
  /** One value per conversation. */
  values: number[];
  /** The mixing weight the solver landed on. */
  solvedA: number;
  /** Realized correlation with the attribute's own pathway; null for a decoy. */
  achievedR: number | null;
  /** The strongest correlation reachable at a = 1 for this base rate; null for a decoy. */
  ceilingR: number | null;
  /** Realized share of items at each value, in value order. */
  achievedShares: number[];
}

const BISECTION_ROUNDS = 60;

/**
 * Cuts a latent vector at its own empirical quantiles, so the realized share of
 * items at each value matches the requested shares exactly rather than
 * approximately. This is one function for both binary and integer attributes:
 * a binary attribute is the two-bin case.
 */
export function assignByShares(latent: number[], shares: number[], minValue: number): number[] {
  const n = latent.length;
  const sorted = [...latent].sort((a, b) => a - b);

  // Cut points are the sorted values at each cumulative share boundary.
  const cuts: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < shares.length - 1; i++) {
    cumulative += shares[i];
    cuts.push(sorted[Math.min(Math.round(cumulative * n), n - 1)]);
  }

  return latent.map(value => {
    let bin = 0;
    while (bin < cuts.length && value >= cuts[bin]) bin++;
    return minValue + bin;
  });
}

function sharesOf(values: number[], shares: number[], minValue: number): number[] {
  return shares.map((_, i) =>
    values.filter(value => value === minValue + i).length / values.length);
}

export function solveAttribute(
  attribute: AttributeConfig,
  scores: number[][],
  config: AlienConfig,
  rng: Rng,
): SolvedAttribute {
  const n = scores.length;

  // Drawn once, before any bisection. Redrawing inside the loop would make the
  // achieved correlation a noisy, non-monotone function of `a` and the search
  // would not converge.
  const noise: number[] = [];
  for (let i = 0; i < n; i++) noise.push(rng.normal());

  if (attribute.pathway === null) {
    const decoyValues = assignByShares(noise, attribute.valueShares, attribute.minValue);
    return {
      key: attribute.key,
      values: decoyValues,
      solvedA: 0,
      achievedR: null,
      ceilingR: null,
      achievedShares: sharesOf(decoyValues, attribute.valueShares, attribute.minValue),
    };
  }

  const pathway = attribute.pathway;
  const column = scores.map(row => row[pathway]);

  const correlationAt = (a: number): { r: number; values: number[] } => {
    const spread = Math.sqrt(Math.max(1 - a * a, 0));
    const latent = column.map((z, i) => a * z + spread * noise[i]);
    const result = assignByShares(latent, attribute.valueShares, attribute.minValue);
    return { r: pearson(result, column).r ?? 0, values: result };
  };

  const ceiling = correlationAt(1).r;
  if (attribute.targetR > ceiling + config.thresholds.correlationTolerance) {
    throw new Error(
      `Attribute "${attribute.key}": requested r=${attribute.targetR} exceeds the ceiling `
      + `r=${ceiling.toFixed(3)} reachable at this value distribution. A value cut from a normal `
      + `latent cannot track it more closely than that. Lower targetR, or move the shares toward `
      + `an even split, which raises the ceiling.`,
    );
  }

  // The correlation rises monotonically with a, so plain bisection converges.
  let low = 0;
  let high = 1;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (low + high) / 2;
    if (correlationAt(middle).r < attribute.targetR) low = middle;
    else high = middle;
  }

  const solvedA = (low + high) / 2;
  const { r, values } = correlationAt(solvedA);
  return {
    key: attribute.key,
    values,
    solvedA,
    achievedR: r,
    ceilingR: ceiling,
    achievedShares: sharesOf(values, attribute.valueShares, attribute.minValue),
  };
}

export function solveAttributes(
  scores: number[][],
  config: AlienConfig,
  rng: Rng,
): SolvedAttribute[] {
  return config.attributes.map(attribute => solveAttribute(attribute, scores, config, rng));
}

/**
 * Lookup that fails loudly. `no-non-null-assertion` is on outside tests, and
 * silently treating a missing attribute as absent would turn a config mistake
 * into a check that quietly passes.
 */
export function solvedFor(solvedAttributes: SolvedAttribute[], key: string): SolvedAttribute {
  const solved = solvedAttributes.find(entry => entry.key === key);
  if (!solved) throw new Error(`Attribute "${key}" was not solved`);
  return solved;
}
