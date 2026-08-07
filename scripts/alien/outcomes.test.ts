import { fourPathwayConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { solveOutcomes } from "./outcomes";

const corpus = buildCorpus(fourPathwayConfig, createRng(fourPathwayConfig.seed));
const solvedAttributes = solveAttributes(corpus.scores, fourPathwayConfig, createRng(2));
const outcomes = solveOutcomes(corpus.scores, solvedAttributes, fourPathwayConfig, createRng(3));

describe("solveOutcomes", () => {
  it("hits the requested error rate where the bias attribute is off", () => {
    expect(Math.abs(outcomes.achieved.errorRateWhenBiasOff - 0.03)).toBeLessThan(0.01);
  });

  it("hits the requested error rate where the bias attribute is on", () => {
    expect(Math.abs(outcomes.achieved.errorRateWhenBiasOn - 0.2)).toBeLessThan(0.01);
  });

  it("pushes the classification toward wait for the biased group", () => {
    expect(outcomes.beta).toBeLessThan(0);
  });

  it("keeps the truth independent of the bias attribute", () => {
    expect(Math.abs(outcomes.achieved.corrTargetWithBias))
      .toBeLessThan(fourPathwayConfig.thresholds.truthBiasMax);
  });

  it("leaves the bias visible in the errors", () => {
    expect(Math.abs(outcomes.achieved.corrCorrectWithBias))
      .toBeGreaterThan(fourPathwayConfig.thresholds.detectableBiasMin);
    expect(outcomes.achieved.corrCorrectWithBias).toBeLessThan(0);
  });

  it("piles most errors onto the biased group", () => {
    expect(outcomes.achieved.shareOfErrorsWhenBiasOn).toBeGreaterThan(0.6);
  });

  it("labels the target", () => {
    outcomes.target.forEach((value, i) => {
      expect(outcomes.targetLabel[i]).toBe(value === 1 ? "approach" : "wait");
    });
  });

  it("keeps the probability on the same side of 0.5 as the classification", () => {
    outcomes.classification.forEach((value, i) => {
      const probability = outcomes.classificationProbability[i];
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThan(1);
      expect(probability > 0.5).toBe(value === 1);
    });
  });

  it("is reproducible", () => {
    const again = solveOutcomes(corpus.scores, solvedAttributes, fourPathwayConfig, createRng(3));
    expect(again.classification).toEqual(outcomes.classification);
    expect(again.beta).toBe(outcomes.beta);
  });

  it("throws when errorRateWhenBiasOn is unreachable", () => {
    const config = { ...fourPathwayConfig, errorRateWhenBiasOn: 0.6 };
    expect(() => solveOutcomes(corpus.scores, solvedAttributes, config, createRng(3)))
      .toThrow(/errorRateWhenBiasOn: requested 0\.6.*reachable limit/s);
  });

  it("throws when errorRateWhenBiasOff is unreachable", () => {
    const config = { ...fourPathwayConfig, errorRateWhenBiasOff: 0.6, errorRateWhenBiasOn: 0.9 };
    expect(() => solveOutcomes(corpus.scores, solvedAttributes, config, createRng(3)))
      .toThrow(/errorRateWhenBiasOff: requested 0\.6.*reachable limit/s);
  });

  it("throws when the bias attribute was not solved", () => {
    const withoutBias = solvedAttributes.filter(attribute => attribute.key !== fourPathwayConfig.biasAttributeKey);
    expect(() => solveOutcomes(corpus.scores, withoutBias, fourPathwayConfig, createRng(3)))
      .toThrow(`Bias attribute "${fourPathwayConfig.biasAttributeKey}" was not solved`);
  });

  it("throws when the bias attribute takes only one value", () => {
    const constantBias = solvedAttributes.map(attribute =>
      (attribute.key === fourPathwayConfig.biasAttributeKey
        ? { ...attribute, values: attribute.values.map(() => 0) }
        : attribute));
    expect(() => solveOutcomes(corpus.scores, constantBias, fourPathwayConfig, createRng(3)))
      .toThrow(`Bias attribute "${fourPathwayConfig.biasAttributeKey}" takes only one value; nothing to bias`);
  });
});
