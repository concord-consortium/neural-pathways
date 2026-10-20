/**
 * @jest-environment node
 */
import { fourPathwayConfig, threePathwayConfig } from "../alien-config";
import snapshot from "../../src/core/network/__fixtures__/alien3-network.json";
import { generate, GeneratorRun } from "./pipeline";
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
    expect(summary).toContain("fa-recovers-pathways");
    expect(summary).toContain("reconstruction R2");
    expect(summary).toContain("refit explained variance by pathway count");
    expect(summary).toContain("word-sum variance split");
  });
});

describe("generate with a network", () => {
  // Fitting the alien3 network takes two or three seconds, so the block fits it once.
  jest.setTimeout(60000);
  let run: GeneratorRun;
  beforeAll(() => {
    run = generate(threePathwayConfig);
  });

  it("fits one only when the config asks", () => {
    expect(generate(fourPathwayConfig).dataset.index.metadata.network).toBeUndefined();
    expect(run.network?.stoppedBy).toBe("margin");
    expect(run.dataset.index.metadata.network).toBe(run.network?.network);
    expect(run.dataset.index.metadata.network?.layers.map(layer => layer.biases.length)).toEqual([10, 8, 6, 2]);
    expect(run.dataset.index.metadata.network?.vocabulary)
      .toEqual(threePathwayConfig.vocabulary.map(entry => entry.word).sort());
  });

  it("leaves every other value the generator emits as it was", () => {
    const withNetwork = run.dataset.index;
    const without = generate({ ...threePathwayConfig, network: undefined }).dataset.index;
    const { network, ...metadata } = withNetwork.metadata;
    expect(network).toBeDefined();
    expect(JSON.stringify({ ...withNetwork, metadata })).toBe(JSON.stringify(without));
  });

  it("reports the network in the summary", () => {
    const summary = formatSummary(run, runChecks(run));
    expect(summary).toMatch(/network\n {2}30 -> 10 -> 8 -> 6 -> 2, stopped by the margin after \d+ epochs/);
    expect(summary).toMatch(/smallest margin 0\.\d{3}/);
  });

  it("emits the network and fit the app's tests use, so the snapshot can't fall behind", () => {
    // See the snapshot's note for how to regenerate it.
    expect(run.network?.network).toEqual(snapshot.network);
    expect(run.dataset.index.metadata.fa_fits[snapshot.fitName]).toEqual(snapshot.fit);
  });
});
