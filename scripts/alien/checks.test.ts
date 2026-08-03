import { alienConfig } from "../alien-config";
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
});
