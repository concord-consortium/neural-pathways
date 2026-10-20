import { Activations, buildActivations } from "./activations";
import { SolvedAttribute, solveAttributes } from "./attributes";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";
import { Corpus, buildCorpus } from "./conversations";
import { Dataset, buildDataset } from "./emit";
import { FittedNetwork, fitNetwork } from "./network";
import { Outcomes, solveOutcomes } from "./outcomes";
import { TemplateNoteRenderer, renderNotes } from "./notes";
import { createRng } from "./rng";

export interface GeneratorRun {
  config: AlienConfig;
  corpus: Corpus;
  solvedAttributes: SolvedAttribute[];
  outcomes: Outcomes;
  notes: string[];
  activations: Activations;
  dataset: Dataset;
  /** Present when config.network asks for one; also in dataset.index.metadata.network. */
  network?: FittedNetwork;
}

/**
 * The stage order, and with it the order the single PRNG is consumed in. Both
 * are part of the output: reordering either changes every value in the dataset
 * for a given seed.
 */
export function generate(config: AlienConfig): GeneratorRun {
  validateConfig(config);
  const rng = createRng(config.seed);

  const corpus = buildCorpus(config, rng);
  const solvedAttributes = solveAttributes(corpus.scores, config, rng);
  const outcomes = solveOutcomes(corpus.scores, solvedAttributes, config, rng);
  const notes = renderNotes(solvedAttributes, config, new TemplateNoteRenderer(config), rng);
  // Last on purpose, so the activation draws never shift the text, attributes,
  // outcomes or notes drawn above.
  const activations = buildActivations(corpus.scores, config, rng);
  const dataset = buildDataset({ corpus, solvedAttributes, outcomes, notes, activations, config });

  // Fitted from the finished dataset, with its own RNG, so it changes nothing drawn above.
  let network: FittedNetwork | undefined;
  if (config.network) {
    network = fitNetwork({
      vocabulary: config.vocabulary.map(entry => entry.word).sort(),
      texts: dataset.texts,
      targets: activations.standardized,
      classification: outcomes.classification,
    }, config.network);
    dataset.index.metadata.network = network.network;
  }

  return { config, corpus, solvedAttributes, outcomes, notes, activations, dataset, network };
}
