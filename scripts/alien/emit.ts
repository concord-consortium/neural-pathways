import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { logisticRegression } from "../../src/explorer/utils/regression";
import { AttributeDefinition } from "../../src/shared/types/attributes";
import { S3Index, S3Review, S3ShapBucket, S3ShapReview } from "../../src/shared/types/s3-data";
import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Corpus } from "./conversations";
import { Outcomes } from "./outcomes";

const CLS = "[CLS]";
const SEP = "[SEP]";
const ID_LENGTH = 12;

export interface Dataset {
  index: S3Index;
  /** Keyed by the two-hex bucket, matching id.slice(0, 2). */
  shapBuckets: Map<string, S3ShapBucket>;
  texts: string[];
  ids: string[];
}

export interface BuildDatasetInput {
  corpus: Corpus;
  solvedAttributes: SolvedAttribute[];
  outcomes: Outcomes;
  notes: string[];
  config: AlienConfig;
}

export function conversationText(turns: string[][]): string {
  return turns.map(turn => turn.join(" ")).join("\n");
}

export function conversationId(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, ID_LENGTH);
}

function attributeDefinitions(config: AlienConfig): AttributeDefinition[] {
  return config.attributes.map(attribute => {
    const definition: AttributeDefinition = {
      key: attribute.key,
      label: attribute.label,
      description: attribute.description,
      type: attribute.type,
      hidden: attribute.hidden,
    };
    if (attribute.type !== "binary") {
      definition.min = attribute.minValue;
      definition.max = attribute.minValue + attribute.valueShares.length - 1;
    }
    if (attribute.valueLabels) definition.valueLabels = attribute.valueLabels;
    return definition;
  });
}

/** Each pathway's share of the total variance of the raw, pre-standardization sums. */
function explainedVariance(corpus: Corpus): number[] {
  const variances = corpus.scoreSd.map(sd => sd * sd);
  const total = variances.reduce((sum, value) => sum + value, 0);
  return variances.map(value => value / total);
}

function shapForConversation(
  id: string,
  turns: string[][],
  scores: number[],
  corpus: Corpus,
  config: AlienConfig,
  weightOf: Map<string, number[]>,
): S3ShapReview {
  const zero = new Array<number>(config.pathwayCount).fill(0);

  const words: { word: string; scores: number[] }[] = [{ word: CLS, scores: [...zero] }];
  for (const turn of turns) {
    for (const word of turn) {
      const weights = weightOf.get(word);
      if (!weights) throw new Error(`Word "${word}" is not in the vocabulary`);
      words.push({ word, scores: weights.map((weight, p) => weight / corpus.scoreSd[p]) });
    }
    words.push({ word: SEP, scores: [...zero] });
  }

  return {
    id,
    base_values: corpus.scoreMean.map((mean, p) => -mean / corpus.scoreSd[p]),
    unmasked_values: [...scores],
    words,
  };
}

export function buildDataset(input: BuildDatasetInput): Dataset {
  const { corpus, solvedAttributes, outcomes, notes, config } = input;
  const { fitName, reviewSetName } = config;

  const texts = corpus.conversations.map(conversation => conversationText(conversation.turns));
  const ids = texts.map(conversationId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error(
      `${ids.length - unique.size} conversations share an id. Two conversations drew identical `
      + `text; widen the word or turn range, or raise the vocabulary size.`,
    );
  }

  const reviews: S3Review[] = texts.map((text, i) => {
    const scores = corpus.scores[i];
    const sumOfSquares = scores.reduce((sum, value) => sum + value * value, 0);
    const attributes: Record<string, number> = {};
    for (const solved of solvedAttributes) attributes[solved.key] = solved.values[i];

    return {
      id: ids[i],
      sources: { [reviewSetName]: [i] },
      text,
      target: outcomes.target[i],
      target_label: outcomes.targetLabel[i],
      observation: notes[i],
      attributes,
      pathway_scores: { [fitName]: [...scores] },
      pathway_variance_fractions: {
        [fitName]: scores.map(value => (sumOfSquares === 0 ? 0 : (value * value) / sumOfSquares)),
      },
      has_shap: [fitName],
      classification: outcomes.classification[i],
      classification_probability: outcomes.classificationProbability[i],
    };
  });

  // Signed log-odds per standard deviation of each pathway, exactly as the real
  // fits report it, fit on the classification the model actually produced.
  const importance = logisticRegression(corpus.scores, outcomes.classification);
  if (!importance) {
    throw new Error("pathway_importance: the logistic fit failed; check the classification split");
  }
  if (!importance.converged) {
    throw new Error(
      "pathway_importance: the logistic fit did not converge within its iteration cap; check "
      + "whether classification has become separable in the pathway scores",
    );
  }

  const weightOf = new Map(config.vocabulary.map(entry => [entry.word, entry.weights]));
  const shapBuckets = new Map<string, S3ShapBucket>();
  ids.forEach((id, i) => {
    const bucket = id.slice(0, 2);
    if (!shapBuckets.has(bucket)) shapBuckets.set(bucket, { reviews: [] });
    (shapBuckets.get(bucket) as S3ShapBucket).reviews.push(shapForConversation(
      id, corpus.conversations[i].turns, corpus.scores[i], corpus, config, weightOf,
    ));
  });

  const index: S3Index = {
    metadata: {
      fa_fits: {
        [fitName]: {
          source_split: reviewSetName,
          n_pathways: config.pathwayCount,
          explained_variance_per_pathway: explainedVariance(corpus),
          pathway_importance: importance.terms.map(term => term.coefficient),
          pathway_score_min: corpus.scores[0].map((_, p) =>
            corpus.scores.reduce((min, row) => Math.min(min, row[p]), Infinity)),
          pathway_score_max: corpus.scores[0].map((_, p) =>
            corpus.scores.reduce((max, row) => Math.max(max, row[p]), -Infinity)),
        },
      },
      review_sets: {
        [reviewSetName]: {
          count: reviews.length,
          description: config.reviewSetDescription,
        },
      },
      attributes: attributeDefinitions(config),
    },
    reviews,
  };

  return { index, shapBuckets, texts, ids };
}

export function writeDataset(outputDir: string, dataset: Dataset): void {
  // Replace rather than merge: a retune changes ids, and leftovers from the
  // previous run would sit in the buckets as conversations the index never
  // mentions.
  fs.rmSync(outputDir, { recursive: true, force: true });
  const fitName = Object.keys(dataset.index.metadata.fa_fits)[0];
  const shapDir = path.join(outputDir, "shap", fitName);
  fs.mkdirSync(shapDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, "index.json"), JSON.stringify(dataset.index));
  for (const bucket of [...dataset.shapBuckets.keys()].sort()) {
    fs.writeFileSync(
      path.join(shapDir, `${bucket}.json`),
      JSON.stringify(dataset.shapBuckets.get(bucket)),
    );
  }
}
