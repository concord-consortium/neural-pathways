/**
 * @jest-environment node
 */
import { fourPathwayConfig } from "../alien-config";
import { generate } from "./pipeline";
import { runChecks } from "./checks";
import { formatSummary } from "./summary";

describe("generate", () => {
  it("is deterministic from the seed", () => {
    const a = generate(fourPathwayConfig);
    const b = generate(fourPathwayConfig);
    expect(JSON.stringify(a.dataset.index)).toBe(JSON.stringify(b.dataset.index));
  });

  it("changes completely with a different seed", () => {
    const a = generate(fourPathwayConfig);
    const b = generate({ ...fourPathwayConfig, seed: fourPathwayConfig.seed + 1 });
    expect(a.dataset.ids[0]).not.toBe(b.dataset.ids[0]);
  });

  it("produces the configured number of conversations", () => {
    const run = generate(fourPathwayConfig);
    expect(run.dataset.index.reviews).toHaveLength(fourPathwayConfig.conversationCount);
    expect(run.notes).toHaveLength(fourPathwayConfig.conversationCount);
  });
});

describe("formatSummary", () => {
  it("reports achieved correlations beside the requested ones", () => {
    const run = generate(fourPathwayConfig);
    const summary = formatSummary(run, runChecks(run));
    expect(summary).toContain("voices_raised");
    expect(summary).toContain("resource_stressed");
    expect(summary).toContain("requested");
    expect(summary).toContain("achieved");
    expect(summary).toContain("pathways-are-orthogonal");
  });
});
