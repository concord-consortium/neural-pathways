import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus, drawConversation } from "./conversations";
import { pearson } from "../../src/explorer/utils/statistics";

describe("drawConversation", () => {
  it("respects the turn and word bounds", () => {
    const rng = createRng(1);
    for (let i = 0; i < 300; i++) {
      const conversation = drawConversation(alienConfig, rng);
      const words = conversation.turns.reduce((sum, turn) => sum + turn.length, 0);
      expect(conversation.turns.length).toBeGreaterThanOrEqual(alienConfig.minTurns);
      expect(conversation.turns.length).toBeLessThanOrEqual(alienConfig.maxTurns);
      expect(words).toBeGreaterThanOrEqual(alienConfig.minWords);
      expect(words).toBeLessThanOrEqual(alienConfig.maxWords);
      for (const turn of conversation.turns) expect(turn.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("sums the drawn words' weights exactly", () => {
    const rng = createRng(2);
    const weightOf = new Map(alienConfig.vocabulary.map(entry => [entry.word, entry.weights]));
    const conversation = drawConversation(alienConfig, rng);
    const expected = new Array(alienConfig.pathwayCount).fill(0);
    for (const turn of conversation.turns) {
      for (const word of turn) {
        weightOf.get(word)!.forEach((weight, p) => { expected[p] += weight; });
      }
    }
    conversation.rawSums.forEach((sum, p) => expect(sum).toBeCloseTo(expected[p], 12));
  });
});

describe("buildCorpus", () => {
  it("is reproducible from the seed", () => {
    const a = buildCorpus(alienConfig, createRng(alienConfig.seed));
    const b = buildCorpus(alienConfig, createRng(alienConfig.seed));
    expect(JSON.stringify(a.conversations)).toBe(JSON.stringify(b.conversations));
  });

  it("standardizes each pathway to mean 0 and sd 1", () => {
    const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const column = corpus.scores.map(row => row[p]);
      const mean = column.reduce((s, v) => s + v, 0) / column.length;
      const variance = column.reduce((s, v) => s + (v - mean) ** 2, 0) / (column.length - 1);
      expect(Math.abs(mean)).toBeLessThan(1e-10);
      expect(Math.abs(variance - 1)).toBeLessThan(1e-10);
    }
  });

  it("tilts word selection toward each conversation's own factors", () => {
    // Only that the tilt is present and points the right way. Its strength scales
    // with the pathway's weight scale, so P3's correlation is much weaker than
    // P0's, and nothing downstream depends on either number.
    const corpus = buildCorpus(alienConfig, createRng(99));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const r = pearson(corpus.conversations.map(c => c.factors[p]), corpus.scores.map(s => s[p])).r;
      expect(r).not.toBeNull();
      expect(r as number).toBeGreaterThan(0.5);
    }
  });

  it("leaves the pathway scores looking continuous, not stepped", () => {
    // A single weight magnitude per pathway would make every score an integer
    // multiple of it, leaving ~21 distinct values across the whole corpus.
    const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const distinct = new Set(corpus.scores.map(row => row[p]));
      expect(distinct.size).toBeGreaterThan(alienConfig.conversationCount / 2);
    }
  });

  it("produces near-orthogonal pathway scores", () => {
    // The bias construction depends on this: if the truth pathway correlated
    // with the bias attribute's pathway, the model would be right, not biased.
    const corpus = buildCorpus({ ...alienConfig, conversationCount: 4000 }, createRng(7));
    for (let a = 0; a < alienConfig.pathwayCount; a++) {
      for (let b = a + 1; b < alienConfig.pathwayCount; b++) {
        const r = pearson(corpus.scores.map(s => s[a]), corpus.scores.map(s => s[b])).r;
        expect(Math.abs(r as number)).toBeLessThan(0.06);
      }
    }
  });
});
