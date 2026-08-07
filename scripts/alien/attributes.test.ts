import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { assignByShares, solveAttribute, solveAttributes } from "./attributes";
import { AttributeConfig } from "./config-types";
import { pearson } from "../../src/explorer/utils/statistics";

const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));

function attribute(key: string): AttributeConfig {
  return alienConfig.attributes.find(a => a.key === key)!;
}

describe("assignByShares", () => {
  it("realizes the requested shares", () => {
    const latent = Array.from({ length: 1000 }, (_, i) => i / 1000);
    const values = assignByShares(latent, [0.7, 0.3], 0);
    expect(values.filter(v => v === 1).length).toBe(300);
    expect(values.filter(v => v === 0).length).toBe(700);
  });

  it("offsets values by minValue and orders bins by the latent", () => {
    const latent = [0.9, 0.1, 0.5];
    expect(assignByShares(latent, [1 / 3, 1 / 3, 1 / 3], 1)).toEqual([3, 1, 2]);
  });
});

describe("solveAttribute", () => {
  it("hits the requested correlation for a strong binary attribute", () => {
    const solved = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(101));
    expect(Math.abs((solved.achievedR as number) - 0.65))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
  });

  it("hits the requested correlation for a weak binary attribute", () => {
    const solved = solveAttribute(attribute("engaged_in_task"), corpus.scores, alienConfig,
      createRng(102));
    expect(Math.abs((solved.achievedR as number) - 0.35))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
  });

  it("hits the requested correlation for an integer attribute", () => {
    const solved = solveAttribute(attribute("group_size"), corpus.scores, alienConfig,
      createRng(103));
    expect(Math.abs((solved.achievedR as number) - 0.15))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
    expect(Math.min(...solved.values)).toBe(1);
    expect(Math.max(...solved.values)).toBe(6);
  });

  it("leaves a decoy uncorrelated with every pathway", () => {
    const solved = solveAttribute(attribute("near_water"), corpus.scores, alienConfig,
      createRng(104));
    expect(solved.solvedA).toBe(0);
    expect(solved.achievedR).toBeNull();
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const r = pearson(solved.values, corpus.scores.map(s => s[p])).r;
      expect(Math.abs(r as number)).toBeLessThan(alienConfig.thresholds.decoyMax);
    }
  });

  it("realizes the requested value shares", () => {
    const solved = solveAttribute(attribute("resource_stressed"), corpus.scores, alienConfig,
      createRng(105));
    const ones = solved.values.filter(v => v === 1).length;
    expect(ones).toBe(Math.round(0.3 * alienConfig.conversationCount));
  });

  it("refuses a correlation above the ceiling for its base rate", () => {
    const impossible: AttributeConfig = { ...attribute("voices_raised"), targetR: 0.95 };
    expect(() => solveAttribute(impossible, corpus.scores, alienConfig, createRng(106)))
      .toThrow(/ceiling/i);
  });

  it("is reproducible", () => {
    const first = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(107));
    const second = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(107));
    expect(first.values).toEqual(second.values);
    expect(first.solvedA).toBe(second.solvedA);
  });
});

describe("solveAttributes", () => {
  it("returns one entry per configured attribute, in order", () => {
    const solved = solveAttributes(corpus.scores, alienConfig, createRng(1));
    expect(solved.map(s => s.key)).toEqual(alienConfig.attributes.map(a => a.key));
  });
});
