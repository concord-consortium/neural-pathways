import * as path from "path";
import { fourPathwayConfig } from "../alien-config";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";

function clone(): AlienConfig {
  return JSON.parse(JSON.stringify(fourPathwayConfig)) as AlienConfig;
}

describe("validateConfig", () => {
  it("accepts the shipped config", () => {
    expect(() => validateConfig(fourPathwayConfig)).not.toThrow();
  });

  it("rejects a duplicate vocabulary word", () => {
    const config = clone();
    config.vocabulary[1].word = config.vocabulary[0].word;
    expect(() => validateConfig(config)).toThrow(/duplicate vocabulary word/i);
  });

  it("rejects a word with weight in two pathways", () => {
    const config = clone();
    config.vocabulary[0].weights[1] = 0.4;
    expect(() => validateConfig(config)).toThrow(/exactly one pathway/i);
  });

  it("rejects a pathway group that is not symmetric under negation", () => {
    const config = clone();
    config.vocabulary[0].weights[0] = -config.vocabulary[0].weights[0];
    expect(() => validateConfig(config)).toThrow(/symmetric under negation/i);
  });

  it("rejects value shares that do not sum to one", () => {
    const config = clone();
    config.attributes[0].valueShares = [0.5, 0.4];
    expect(() => validateConfig(config)).toThrow(/sum to 1/i);
  });

  it("rejects a value with fewer than two note fragments", () => {
    const config = clone();
    config.attributes[0].notes[1] = ["only one"];
    expect(() => validateConfig(config)).toThrow(/at least two note fragments/i);
  });

  it("rejects a fragment reused across attributes", () => {
    const config = clone();
    config.attributes[1].notes[1][0] = config.attributes[0].notes[1][0];
    expect(() => validateConfig(config)).toThrow(/fragment/i);
  });

  it("rejects a fragment that contains another fragment", () => {
    const config = clone();
    config.fillerFragments[0] = `Note: ${config.attributes[0].notes[0][0]} And more.`;
    expect(() => validateConfig(config)).toThrow(/substring/i);
  });

  it("rejects an empty outputDir", () => {
    const config = clone();
    config.outputDir = "";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an outputDir of \".\"", () => {
    const config = clone();
    config.outputDir = ".";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an absolute outputDir", () => {
    // The second path lands inside dist/ relative to the check's stand-in root, so only
    // the absolute-path clause rejects it.
    for (const dir of ["/tmp/alien-data", path.resolve("/repo", "dist", "alien-data")]) {
      const config = clone();
      config.outputDir = dir;
      expect(() => validateConfig(config)).toThrow(/outputDir/i);
    }
  });

  it("rejects an outputDir that escapes via ..", () => {
    const config = clone();
    config.outputDir = "../alien-data";
    expect(() => validateConfig(config)).toThrow(/outputDir/i);
  });

  it("rejects an outputDir outside dist/, such as a source folder", () => {
    for (const dir of ["src", "generator", "docs/alien-data", "dist/../src"]) {
      const config = clone();
      config.outputDir = dir;
      expect(() => validateConfig(config)).toThrow(/outputDir/i);
    }
  });

  it("rejects dist/ itself, which holds the whole build", () => {
    for (const dir of ["dist", "dist/", "dist/."]) {
      const config = clone();
      config.outputDir = dir;
      expect(() => validateConfig(config)).toThrow(/outputDir/i);
    }
  });

  it("accepts a folder inside dist/", () => {
    for (const dir of ["dist/alien-data", "./dist/alien-data-3", "dist/nested/alien", "dist/..cache"]) {
      const config = clone();
      config.outputDir = dir;
      expect(() => validateConfig(config)).not.toThrow();
    }
  });

  it("rejects an unknown bias attribute key", () => {
    const config = clone();
    config.biasAttributeKey = "nope";
    expect(() => validateConfig(config)).toThrow(/bias attribute/i);
  });

  it("rejects a bias attribute that is not binary", () => {
    const config = clone();
    config.attributes.find(a => a.key === "resource_stressed")!.type = "integer";
    expect(() => validateConfig(config)).toThrow(/binary/i);
  });

  it("rejects a binary attribute whose values do not start at 0", () => {
    // Outcomes and checks read a binary attribute's 1 as "on", so values {1, 2} would invert
    // its meaning. Notes are re-keyed so only minValue is wrong.
    const config = clone();
    const binary = config.attributes.find(a => a.type === "binary" && a.key !== config.biasAttributeKey)!;
    binary.notes = { 1: binary.notes[0], 2: binary.notes[1] };
    binary.minValue = 1;
    expect(() => validateConfig(config)).toThrow(/binary attribute's values must be 0 and 1/);
  });

  it("rejects an attribute key that collides with a reserved search field", () => {
    const config = clone();
    config.attributes[0].key = "text";
    expect(() => validateConfig(config)).toThrow(/reserved/i);
  });

  it("rejects a neuron count below the identifiability floor", () => {
    // Four pathways need (n - 4)^2 >= n + 4, which 7 neurons fails and 8 passes.
    const config = clone();
    config.activations.neuronCount = 7;
    expect(() => validateConfig(config)).toThrow(/identif/i);
    config.activations.neuronCount = 8;
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects an explained variance total outside (0, 1)", () => {
    const config = clone();
    config.activations.explainedVarianceTotal = 1;
    expect(() => validateConfig(config)).toThrow(/explainedVarianceTotal/);
  });

  it("rejects a noise variance range that is unordered", () => {
    const config = clone();
    config.activations.noiseVarianceRange = [0.2, 0.1];
    expect(() => validateConfig(config)).toThrow(/noiseVarianceRange .* must be ordered low to high/);
  });

  it("rejects a noise variance range whose low end is zero or negative", () => {
    // The worst-case check below would also reject [0, 0.1], but not [-0.05, 0.1]: a negative
    // low end makes its denominator negative. Only the lower-bound check catches both.
    for (const range of [[0, 0.1], [-0.05, 0.1]] as [number, number][]) {
      const config = clone();
      config.activations.noiseVarianceRange = range;
      expect(() => validateConfig(config)).toThrow(/noiseVarianceRange lower bound .* must exceed 0/);
    }
  });

  // Draws are rescaled to mean 1 - explainedVarianceTotal. The worst case is one draw at the
  // top of the range and the other 13 at the bottom: high * (1 - E) * 14 / (high + 13 * low).
  // With E = 0.5 and low = 0.4 that reaches 1 at high ≈ 0.867.
  it("rejects a noise variance range whose worst case is just over 1", () => {
    const config = clone();
    config.activations.explainedVarianceTotal = 0.5;
    config.activations.noiseVarianceRange = [0.4, 0.87];  // worst case ≈ 1.003
    expect(() => validateConfig(config)).toThrow(/noiseVarianceRange .* can rescale/);
  });

  it("accepts a noise variance range whose worst case is just under 1", () => {
    const config = clone();
    config.activations.explainedVarianceTotal = 0.5;
    config.activations.noiseVarianceRange = [0.4, 0.86];  // worst case ≈ 0.993
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects a scaler scale range that is not positive", () => {
    const config = clone();
    config.activations.scalerScaleRange = [0, 0.5];
    expect(() => validateConfig(config)).toThrow(/scalerScaleRange/);
  });

  it("rejects recovery thresholds outside (0, 1]", () => {
    const config = clone();
    config.thresholds.faScoreRecoveryMin = 1.2;
    expect(() => validateConfig(config)).toThrow(/faScoreRecoveryMin/);
  });

  it("rejects a neuron count at or below the pathway count", () => {
    // The floor squares its difference, so on its own it also admits counts
    // below the pathway count: 1 neuron against 4 pathways gives (1 - 4)^2 = 9,
    // which clears 1 + 4 while being unfittable by any factor analysis.
    const config = clone();
    config.activations.neuronCount = 1;
    expect(() => validateConfig(config)).toThrow(/identif/i);
    config.activations.neuronCount = 4;
    expect(() => validateConfig(config)).toThrow(/identif/i);
  });

  it("rejects target variance shares that do not sum to 1", () => {
    // The solver's row and column constraints are only consistent at a total of
    // 1. At any other total it still converges, to the normalized split, so the
    // configured shares would be silently rescaled rather than rejected.
    const config = clone();
    config.targetVarianceShares = config.targetVarianceShares.map(share => share * 0.8);
    expect(() => validateConfig(config)).toThrow(/targetVarianceShares/);
  });

  it("rejects a target variance share that is not positive", () => {
    const config = clone();
    config.targetVarianceShares = [0.55, 0.35, 0.1, 0];
    expect(() => validateConfig(config)).toThrow(/targetVarianceShares/);
  });
});
