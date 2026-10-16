import { fourPathwayConfig, threePathwayConfig } from "../alien-config";
import { assignByShares } from "./attributes";
import { generate, GeneratorRun } from "./pipeline";
import { CheckResult, runChecks } from "./checks";

const run = generate(fourPathwayConfig);
const checks = runChecks(run);

describe("runChecks", () => {
  it("reports nine checks for a dataset without a network", () => {
    expect(checks).toHaveLength(9);
    expect(checks.map(c => c.name)).toEqual([
      "shap-additivity",
      "note-evidence",
      "achieved-correlations",
      "word-coverage",
      "truth-is-unbiased",
      "bias-is-detectable",
      "decoys-are-decoys",
      "pathways-are-orthogonal",
      "fa-recovers-pathways",
    ]);
  });

  it("passes on the shipped config", () => {
    const failed = checks.filter(check => !check.passed);
    expect(failed.map(f => `${f.name}: ${f.detail}`)).toEqual([]);
  });

  it("always states a measured value, whether it passed or not", () => {
    for (const check of checks) expect(check.detail).toMatch(/\d/);
  });

  it("fails truth-is-unbiased when the truth is made to track the bias attribute", () => {
    const bias = run.solvedAttributes.find(a => a.key === fourPathwayConfig.biasAttributeKey)!;
    const rigged = {
      ...run,
      outcomes: { ...run.outcomes, target: [...bias.values] },
    };
    const result = runChecks(rigged).find(c => c.name === "truth-is-unbiased")!;
    expect(result.passed).toBe(false);
  });

  it("fails bias-is-detectable when the model never errs on the biased group", () => {
    const rigged = {
      ...run,
      outcomes: {
        ...run.outcomes,
        modelCorrect: run.outcomes.modelCorrect.map(() => 1),
      },
    };
    const result = runChecks(rigged).find(c => c.name === "bias-is-detectable")!;
    expect(result.passed).toBe(false);
  });

  it("fails shap-additivity when a SHAP entry's base value is perturbed", () => {
    const firstKey = [...run.dataset.shapBuckets.keys()][0];
    // JSON round-trip deep-clones just the one bucket we mutate; the Map itself
    // is copied shallowly so every other bucket keeps its original reference.
    const clonedBucket = JSON.parse(JSON.stringify(run.dataset.shapBuckets.get(firstKey)));
    clonedBucket.reviews[0].base_values[0] += 1;
    const riggedBuckets = new Map(run.dataset.shapBuckets);
    riggedBuckets.set(firstKey, clonedBucket);
    const rigged = {
      ...run,
      dataset: { ...run.dataset, shapBuckets: riggedBuckets },
    };
    const result = runChecks(rigged).find(c => c.name === "shap-additivity")!;
    expect(result.passed).toBe(false);
  });

  it("fails note-evidence when a note is replaced with text attesting nothing", () => {
    const riggedNotes = [...run.notes];
    riggedNotes[0] = "";
    const rigged = { ...run, notes: riggedNotes };
    const result = runChecks(rigged).find(c => c.name === "note-evidence")!;
    expect(result.passed).toBe(false);
  });

  it("fails achieved-correlations when a solved attribute's achievedR drifts from its target", () => {
    const target = run.config.attributes.find(a => a.pathway !== null)!;
    const riggedAttributes = run.solvedAttributes.map(solved =>
      (solved.key === target.key ? { ...solved, achievedR: target.targetR + 1 } : solved));
    const rigged = { ...run, solvedAttributes: riggedAttributes };
    const result = runChecks(rigged).find(c => c.name === "achieved-correlations")!;
    expect(result.passed).toBe(false);
  });

  it("fails word-coverage when the threshold is raised above the real minimum", () => {
    const riggedConfig = {
      ...run.config,
      thresholds: {
        ...run.config.thresholds,
        minWordOccurrences: run.config.conversationCount + 1,
      },
    };
    const rigged = { ...run, config: riggedConfig };
    const result = runChecks(rigged).find(c => c.name === "word-coverage")!;
    expect(result.passed).toBe(false);
  });

  it("fails decoys-are-decoys when a decoy's values are cut directly from a pathway score", () => {
    const decoy = run.config.attributes.find(a => a.pathway === null)!;
    // Cut on the real pathway 0 column, the same way a strongly-tracking attribute
    // would be solved, so the rigged values still land on valid, note-backed labels.
    const trackingValues = assignByShares(
      run.corpus.scores.map(row => row[0]), decoy.valueShares, decoy.minValue,
    );
    const riggedAttributes = run.solvedAttributes.map(solved =>
      (solved.key === decoy.key ? { ...solved, values: trackingValues } : solved));
    const rigged = { ...run, solvedAttributes: riggedAttributes };
    const result = runChecks(rigged).find(c => c.name === "decoys-are-decoys")!;
    expect(result.passed).toBe(false);
  });

  it("fails pathways-are-orthogonal when two pathway score columns are made identical", () => {
    const riggedScores = run.corpus.scores.map(row => {
      const copy = [...row];
      copy[1] = copy[0];
      return copy;
    });
    const rigged = { ...run, corpus: { ...run.corpus, scores: riggedScores } };
    const result = runChecks(rigged).find(c => c.name === "pathways-are-orthogonal")!;
    expect(result.passed).toBe(false);
  });

  it("fails fa-recovers-pathways when the activations are shuffled across items", () => {
    const rigged = {
      ...run,
      activations: {
        ...run.activations,
        standardized: [...run.activations.standardized].reverse(),
      },
    };
    const result = runChecks(rigged).find(c => c.name === "fa-recovers-pathways")!;
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/P0/);
  });

  it("names every pathway's recovered factor, correlation and cosine when it passes", () => {
    const result = checks.find(c => c.name === "fa-recovers-pathways")!;
    expect(result.passed).toBe(true);
    for (let p = 0; p < fourPathwayConfig.pathwayCount; p++) {
      expect(result.detail).toMatch(new RegExp(`P${p}->F${p} r [01]\\.\\d+ cos [01]\\.\\d+`));
    }
  });
});

describe("runChecks on a dataset with a network", () => {
  let run3: GeneratorRun;
  let checks3: CheckResult[];
  const find = (results: CheckResult[], name: string) => results.find(c => c.name === name)!;

  beforeAll(() => {
    run3 = generate(threePathwayConfig);
    checks3 = runChecks(run3);
  }, 60000);

  it("adds the two network checks after the nine", () => {
    expect(checks3.map(c => c.name).slice(9)).toEqual([
      "network-reproduces-classification",
      "network-tracks-activations",
    ]);
  });

  it("passes on the shipped config, stating the measured values", () => {
    const failed = checks3.filter(check => !check.passed);
    expect(failed.map(f => `${f.name}: ${f.detail}`)).toEqual([]);
    expect(find(checks3, "network-reproduces-classification").detail)
      .toMatch(/^all 800 conversations, smallest margin 0\.\d{3} \(minimum 0\.1\)$/);
    expect(find(checks3, "network-tracks-activations").detail)
      .toMatch(/^weakest unit tracks neuron \d+ at r 0\.\d{3} \(minimum 0\.85\)$/);
  });

  it("fails when a classification is flipped, naming the conversation", () => {
    const flipped = [...run3.outcomes.classification];
    flipped[0] = 1 - flipped[0];
    const rigged = { ...run3, outcomes: { ...run3.outcomes, classification: flipped } };
    const result = find(runChecks(rigged), "network-reproduces-classification");
    expect(result.passed).toBe(false);
    expect(result.detail).toContain(run3.dataset.ids[0]);
  });

  it("fails when conversations clear their class by less than the margin", () => {
    const rigged = { ...run3, config: { ...run3.config, network: { ...run3.config.network!, margin: 1000 } } };
    const result = find(runChecks(rigged), "network-reproduces-classification");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/^800 conversations under the 1000 margin/);
  });

  it("says to try another seed when fitting ran out of epochs", () => {
    const rigged = {
      ...run3,
      config: { ...run3.config, network: { ...run3.config.network!, margin: 1000 } },
      network: { ...run3.network!, stoppedBy: "cap" as const, epochs: 6000 },
    };
    expect(find(runChecks(rigged), "network-reproduces-classification").detail)
      .toMatch(/stopped at network\.maxEpochs \(6000\); try another network\.seed/);
  });

  it("fails network-tracks-activations when the activations are shuffled across conversations", () => {
    const rigged = {
      ...run3,
      activations: { ...run3.activations, standardized: [...run3.activations.standardized].reverse() },
    };
    const result = find(runChecks(rigged), "network-tracks-activations");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/neuron 0 r -?0\.\d{3}/);
  });

  it("fails both when the dataset carries no network", () => {
    const { network: _network, ...metadata } = run3.dataset.index.metadata;
    const rigged = { ...run3, dataset: { ...run3.dataset, index: { ...run3.dataset.index, metadata } } };
    const results = runChecks(rigged);
    expect(find(results, "network-reproduces-classification").passed).toBe(false);
    expect(find(results, "network-tracks-activations").passed).toBe(false);
  });
});
