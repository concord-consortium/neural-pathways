/**
 * @jest-environment node
 */
import { alienConfig } from "../alien-config";
import { generate } from "./pipeline";
import { runChecks } from "./checks";
import { formatSummary } from "./summary";

describe("generate", () => {
  it("is deterministic from the seed", () => {
    const a = generate(alienConfig);
    const b = generate(alienConfig);
    expect(JSON.stringify(a.dataset.index)).toBe(JSON.stringify(b.dataset.index));
  });

  it("changes completely with a different seed", () => {
    const a = generate(alienConfig);
    const b = generate({ ...alienConfig, seed: alienConfig.seed + 1 });
    expect(a.dataset.ids[0]).not.toBe(b.dataset.ids[0]);
  });

  it("produces the configured number of conversations", () => {
    const run = generate(alienConfig);
    expect(run.dataset.index.reviews).toHaveLength(alienConfig.conversationCount);
    expect(run.notes).toHaveLength(alienConfig.conversationCount);
  });
});

describe("formatSummary", () => {
  it("reports achieved correlations beside the requested ones", () => {
    const run = generate(alienConfig);
    const summary = formatSummary(run, runChecks(run));
    expect(summary).toContain("voices_raised");
    expect(summary).toContain("resource_stressed");
    expect(summary).toContain("requested");
    expect(summary).toContain("achieved");
    expect(summary).toContain("pathways-are-orthogonal");
  });
});
