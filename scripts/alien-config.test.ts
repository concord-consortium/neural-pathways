import { alienConfigs, fourPathwayConfig, threePathwayConfig } from "./alien-config";
import { validateConfig } from "./alien/config-validation";
import { buildCorpus } from "./alien/conversations";
import { createRng } from "./alien/rng";

describe("alienConfigs", () => {
  it("emits both datasets", () => {
    expect(alienConfigs).toEqual([fourPathwayConfig, threePathwayConfig]);
  });

  it("gives each dataset its own output directory, fit name and review set", () => {
    // writeDataset deletes outputDir before writing, so two configs sharing one
    // would leave only the second dataset on disk. Sharing a fitName or
    // reviewSetName would collide inside the emitted metadata instead.
    for (const field of ["outputDir", "fitName", "reviewSetName"] as const) {
      expect(new Set(alienConfigs.map(config => config[field])).size).toBe(alienConfigs.length);
    }
  });

  it("validates every config", () => {
    for (const config of alienConfigs) {
      expect(() => validateConfig(config)).not.toThrow();
    }
  });
});

describe("threePathwayConfig", () => {
  it("has three pathways", () => {
    expect(threePathwayConfig.pathwayCount).toBe(3);
    expect(threePathwayConfig.targetVarianceShares).toHaveLength(3);
  });

  it("keeps the truth on P0 and puts the planted bias on P2", () => {
    const attribute = (key: string) => threePathwayConfig.attributes.find(a => a.key === key);
    expect(threePathwayConfig.truthPathway).toBe(0);
    expect(attribute("voices_raised")?.pathway).toBe(0);
    expect(threePathwayConfig.biasAttributeKey).toBe("resource_stressed");
    expect(attribute("resource_stressed")?.pathway).toBe(2);
    expect(attribute("resource_stressed")?.hidden).toBe(true);
  });

  it("demotes group_size to a decoy but keeps it in the dataset", () => {
    // It is the only non-binary attribute, and the fields and correlations
    // views need one to exercise their integer handling.
    const groupSize = threePathwayConfig.attributes.find(a => a.key === "group_size");
    expect(groupSize?.pathway).toBeNull();
    expect(groupSize?.targetR).toBe(0);
    expect(groupSize?.type).toBe("integer");
  });

  it("carries thirty words, each weighted in exactly one of three pathways", () => {
    expect(threePathwayConfig.vocabulary).toHaveLength(30);
    for (const entry of threePathwayConfig.vocabulary) {
      expect(entry.weights).toHaveLength(3);
      expect(entry.weights.filter(weight => weight !== 0)).toHaveLength(1);
    }
  });

  it("gives the bias pathway the same ten words it has in the four-pathway dataset", () => {
    // The pivotal step of the activity is filtering to high scores on the bias
    // pathway and reading the words that turn up. Keeping those ten words the
    // same in both datasets is what makes a comparison between the two isolate
    // the pathway count.
    const wordsOn = (config: typeof fourPathwayConfig, pathway: number) => config.vocabulary
      .filter(entry => entry.weights[pathway] !== 0).map(entry => entry.word).sort();
    expect(wordsOn(threePathwayConfig, 2)).toEqual(wordsOn(fourPathwayConfig, 3));
  });
});

describe("realized variance split", () => {
  // No generator self-check asserts this — targetVarianceShares is reported
  // against, not enforced — so this is what keeps the solved scales honest.
  for (const config of alienConfigs) {
    it(`${config.fitName} lands within a point of its target split`, () => {
      const corpus = buildCorpus(config, createRng(config.seed));
      const variances = corpus.scoreSd.map(sd => sd * sd);
      const total = variances.reduce((sum, value) => sum + value, 0);
      variances.forEach((variance, p) => {
        expect(Math.abs(variance / total - config.targetVarianceShares[p])).toBeLessThan(0.01);
      });
    });
  }
});
