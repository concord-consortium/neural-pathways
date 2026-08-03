import { alienConfig } from "../alien-config";
import { assignByShares } from "./attributes";
import { generate } from "./pipeline";
import { runChecks } from "./checks";

const run = generate(alienConfig);
const checks = runChecks(run);

describe("runChecks", () => {
  it("reports all eight checks", () => {
    expect(checks).toHaveLength(8);
    expect(checks.map(c => c.name)).toEqual([
      "shap-additivity",
      "note-evidence",
      "achieved-correlations",
      "word-coverage",
      "truth-is-unbiased",
      "bias-is-detectable",
      "decoys-are-decoys",
      "pathways-are-orthogonal",
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
    const bias = run.solvedAttributes.find(a => a.key === alienConfig.biasAttributeKey)!;
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
});
