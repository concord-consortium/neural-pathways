/**
 * @jest-environment node
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fourPathwayConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { solveOutcomes } from "./outcomes";
import { TemplateNoteRenderer, renderNotes } from "./notes";
import { buildDataset, conversationId, conversationText, writeDataset } from "./emit";

const config = { ...fourPathwayConfig, conversationCount: 200 };
const corpus = buildCorpus(config, createRng(config.seed));
const solvedAttributes = solveAttributes(corpus.scores, config, createRng(2));
const outcomes = solveOutcomes(corpus.scores, solvedAttributes, config, createRng(3));
const notes = renderNotes(solvedAttributes, config, new TemplateNoteRenderer(config), createRng(4));
const dataset = buildDataset({ corpus, solvedAttributes, outcomes, notes, config });

describe("conversationText and conversationId", () => {
  it("joins words within a turn and turns with newlines", () => {
    expect(conversationText([["a", "b"], ["c"]])).toBe("a b\nc");
  });

  it("hashes to 12 hex characters", () => {
    expect(conversationId("hello")).toMatch(/^[0-9a-f]{12}$/);
    expect(conversationId("hello")).toBe(conversationId("hello"));
    expect(conversationId("hello")).not.toBe(conversationId("goodbye"));
  });
});

describe("buildDataset", () => {
  it("gives every conversation a unique id", () => {
    expect(new Set(dataset.ids).size).toBe(config.conversationCount);
  });

  it("declares one fit with four pathways and no activation model", () => {
    const fit = dataset.index.metadata.fa_fits[config.fitName];
    expect(fit.n_pathways).toBe(4);
    expect(fit.source_split).toBe(config.reviewSetName);
    expect(fit.explained_variance_per_pathway).toHaveLength(4);
    expect(fit.pathway_importance).toHaveLength(4);
    expect(fit.loadings).toBeUndefined();
    expect(fit.scaler_mean).toBeUndefined();
    expect(fit.explained_variance_total).toBeUndefined();
  });

  it("sets pathway score bounds to the corpus column extremes", () => {
    const fit = dataset.index.metadata.fa_fits[config.fitName];
    for (let p = 0; p < config.pathwayCount; p++) {
      const column = corpus.scores.map(row => row[p]);
      expect(fit.pathway_score_min[p]).toBe(Math.min(...column));
      expect(fit.pathway_score_max[p]).toBe(Math.max(...column));
      // Standardized scores straddle zero.
      expect(fit.pathway_score_min[p]).toBeLessThan(0);
      expect(fit.pathway_score_max[p]).toBeGreaterThan(0);
    }
  });

  it("orders explained variance by the configured target split", () => {
    const shares = dataset.index.metadata.fa_fits[config.fitName].explained_variance_per_pathway;
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    for (let p = 1; p < shares.length; p++) expect(shares[p]).toBeLessThan(shares[p - 1]);
  });

  it("carries the attribute definitions, hidden flags included", () => {
    const definitions = dataset.index.metadata.attributes!;
    expect(definitions.map(d => d.key)).toEqual(config.attributes.map(a => a.key));
    expect(definitions.find(d => d.key === "resource_stressed")!.hidden).toBe(true);
    expect(definitions.find(d => d.key === "voices_raised")!.hidden).toBe(false);
    const groupSize = definitions.find(d => d.key === "group_size")!;
    expect(groupSize.min).toBe(1);
    expect(groupSize.max).toBe(6);
  });

  it("writes every attribute onto every review, hidden included", () => {
    for (const review of dataset.index.reviews) {
      expect(Object.keys(review.attributes!).sort())
        .toEqual(config.attributes.map(a => a.key).sort());
    }
  });

  it("omits reconstruction_r2", () => {
    for (const review of dataset.index.reviews) {
      expect(review.reconstruction_r2).toBeUndefined();
    }
  });

  it("carries observation, labels, and variance fractions", () => {
    dataset.index.reviews.forEach((review, i) => {
      expect(review.observation).toBe(notes[i]);
      expect(review.target).toBe(outcomes.target[i]);
      expect(review.target_label).toBe(outcomes.targetLabel[i]);
      expect(review.classification).toBe(outcomes.classification[i]);
      expect(review.has_shap).toEqual([config.fitName]);
      expect(review.sources).toEqual({ [config.reviewSetName]: [i] });
      const fractions = review.pathway_variance_fractions[config.fitName];
      expect(fractions.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    });
  });

  it("produces SHAP that adds up exactly", () => {
    const scoreById = new Map(dataset.index.reviews.map(r => [r.id, r.pathway_scores[config.fitName]]));
    let checked = 0;
    for (const bucket of dataset.shapBuckets.values()) {
      for (const entry of bucket.reviews) {
        const expected = scoreById.get(entry.id)!;
        for (let p = 0; p < config.pathwayCount; p++) {
          const total = entry.words.reduce((sum, word) => sum + word.scores[p], entry.base_values[p]);
          expect(Math.abs(total - expected[p])).toBeLessThan(config.thresholds.shapTolerance);
          expect(Math.abs(entry.unmasked_values[p] - expected[p])).toBeLessThan(1e-12);
        }
        checked++;
      }
    }
    expect(checked).toBe(config.conversationCount);
  });

  it("gives separator tokens zero weight in every pathway", () => {
    const first = [...dataset.shapBuckets.values()][0].reviews[0];
    expect(first.words[0].word).toBe("[CLS]");
    expect(first.words[first.words.length - 1].word).toBe("[SEP]");
    for (const word of first.words) {
      if (word.word === "[CLS]" || word.word === "[SEP]") {
        // eslint-disable-next-line jest/no-conditional-expect -- only [CLS]/[SEP] carry zero score
        expect(word.scores.every(score => score === 0)).toBe(true);
      }
    }
  });

  it("buckets each conversation by the first two characters of its id", () => {
    for (const [bucket, contents] of dataset.shapBuckets) {
      expect(bucket).toMatch(/^[0-9a-f]{2}$/);
      for (const entry of contents.reviews) expect(entry.id.slice(0, 2)).toBe(bucket);
    }
  });
});

describe("writeDataset", () => {
  it("writes the index and the shap buckets under the fit name", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alien-emit-"));
    try {
      writeDataset(dir, dataset);
      const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
      expect(index.reviews).toHaveLength(config.conversationCount);
      const bucket = [...dataset.shapBuckets.keys()][0];
      const shapPath = path.join(dir, "shap", config.fitName, `${bucket}.json`);
      expect(fs.existsSync(shapPath)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("replaces a previous run rather than merging into it", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alien-emit-"));
    try {
      fs.mkdirSync(path.join(dir, "shap", "stale-fit"), { recursive: true });
      fs.writeFileSync(path.join(dir, "shap", "stale-fit", "aa.json"), "{}");
      writeDataset(dir, dataset);
      expect(fs.existsSync(path.join(dir, "shap", "stale-fit"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
