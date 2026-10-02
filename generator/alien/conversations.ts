import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export interface Conversation {
  /** Words grouped by turn. */
  turns: string[][];
  /** The latent factors that tilted this conversation's word selection. */
  factors: number[];
  /** Per-pathway sum of the drawn words' weights, before standardization. */
  rawSums: number[];
}

export interface Corpus {
  conversations: Conversation[];
  /** [conversation][pathway], standardized across the corpus. */
  scores: number[][];
  scoreMean: number[];
  scoreSd: number[];
}

/**
 * Splits a word budget across turns, giving every turn at least two words and
 * scattering the rest. Config validation guarantees minWords >= 2 * maxTurns, so
 * the budget always covers the floor.
 */
function splitAcrossTurns(totalWords: number, turnCount: number, rng: Rng): number[] {
  const lengths = new Array<number>(turnCount).fill(2);
  for (let remaining = totalWords - 2 * turnCount; remaining > 0; remaining--) {
    lengths[rng.int(0, turnCount - 1)]++;
  }
  return lengths;
}

export function drawConversation(config: AlienConfig, rng: Rng): Conversation {
  const factors: number[] = [];
  for (let p = 0; p < config.pathwayCount; p++) factors.push(rng.normal());

  // Each word's draw probability is tilted by how well it aligns with this
  // conversation's factors. Nothing downstream reads the factors again.
  const tilt = config.vocabulary.map(entry => {
    let dot = 0;
    for (let p = 0; p < config.pathwayCount; p++) dot += factors[p] * entry.weights[p];
    return Math.exp(config.tiltLambda * dot);
  });

  const turnCount = rng.int(config.minTurns, config.maxTurns);
  const totalWords = Math.max(rng.int(config.minWords, config.maxWords), 2 * turnCount);
  const lengths = splitAcrossTurns(totalWords, turnCount, rng);

  const rawSums = new Array<number>(config.pathwayCount).fill(0);
  const turns = lengths.map(length => {
    const words: string[] = [];
    for (let i = 0; i < length; i++) {
      const entry = config.vocabulary[rng.weightedIndex(tilt)];
      words.push(entry.word);
      for (let p = 0; p < config.pathwayCount; p++) rawSums[p] += entry.weights[p];
    }
    return words;
  });

  return { turns, factors, rawSums };
}

export function buildCorpus(config: AlienConfig, rng: Rng): Corpus {
  const conversations: Conversation[] = [];
  for (let i = 0; i < config.conversationCount; i++) {
    conversations.push(drawConversation(config, rng));
  }

  const scoreMean: number[] = [];
  const scoreSd: number[] = [];
  for (let p = 0; p < config.pathwayCount; p++) {
    const column = conversations.map(c => c.rawSums[p]);
    const mean = column.reduce((sum, value) => sum + value, 0) / column.length;
    const sumSquares = column.reduce((sum, value) => sum + (value - mean) ** 2, 0);
    const sd = Math.sqrt(sumSquares / (column.length - 1));
    if (!(sd > 0)) {
      throw new Error(`Pathway ${p} has no variance across the corpus; check its word weights`);
    }
    scoreMean.push(mean);
    scoreSd.push(sd);
  }

  const scores = conversations.map(c =>
    c.rawSums.map((sum, p) => (sum - scoreMean[p]) / scoreSd[p]));

  return { conversations, scores, scoreMean, scoreSd };
}
