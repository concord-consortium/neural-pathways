import { SolvedAttribute, solveAttributes } from "./attributes";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";
import { Corpus, buildCorpus } from "./conversations";
import { Dataset, buildDataset } from "./emit";
import { Outcomes, solveOutcomes } from "./outcomes";
import { TemplateNoteRenderer, renderNotes } from "./notes";
import { createRng } from "./rng";

export interface GeneratorRun {
  config: AlienConfig;
  corpus: Corpus;
  solvedAttributes: SolvedAttribute[];
  outcomes: Outcomes;
  notes: string[];
  dataset: Dataset;
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
  const dataset = buildDataset({ corpus, solvedAttributes, outcomes, notes, config });

  return { config, corpus, solvedAttributes, outcomes, notes, dataset };
}
