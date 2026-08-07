import { AttributeType } from "../../src/shared/types/attributes";

export interface VocabularyWord {
  word: string;
  /** Weight per pathway; length must equal pathwayCount. */
  weights: number[];
}

export interface AttributeConfig {
  /** Usable directly as a search field name. */
  key: string;
  label: string;
  description: string;
  type: AttributeType;
  /** Which pathway this attribute tracks, or null for a decoy. */
  pathway: number | null;
  /** Requested correlation with that pathway. Ignored when pathway is null. */
  targetR: number;
  hidden: boolean;
  /**
   * Share of items taking each value, in value order. A binary attribute lists
   * two shares, [share of 0, share of 1]; group_size lists six. Shares must be
   * positive and sum to 1.
   */
  valueShares: number[];
  /** Value of the first share. 0 for binary; 1 for an attribute counted from one. */
  minValue: number;
  valueLabels?: Record<number, string>;
  /**
   * Note fragments per value, keyed by the value itself. Every value in
   * valueShares needs at least two, and every fragment across the whole config
   * must be unique and must not be a substring of any other fragment — self-check
   * 2 identifies which value a note attests by substring match.
   */
  notes: Record<number, string[]>;
}

export interface Thresholds {
  /** How far an achieved attribute correlation may sit from its target. */
  correlationTolerance: number;
  /** Largest |r| a decoy may have with any pathway. */
  decoyMax: number;
  /** Largest |r| allowed between two different pathways. */
  pathwayOrthogonalityMax: number;
  /** Largest |corr(target, bias attribute)| — above this the model is right, not biased. */
  truthBiasMax: number;
  /** Smallest |corr(model_correct, bias attribute)| — below this the bias is unfindable. */
  detectableBiasMin: number;
  /** Fewest conversations a vocabulary word must appear in. */
  minWordOccurrences: number;
  /** SHAP additivity tolerance. */
  shapTolerance: number;
}

export interface AlienConfig {
  seed: number;
  conversationCount: number;
  pathwayCount: number;
  fitName: string;
  reviewSetName: string;
  reviewSetDescription: string;
  outputDir: string;

  minTurns: number;
  maxTurns: number;
  minWords: number;
  maxWords: number;
  /** How sharply a conversation's latent factors tilt its word selection. */
  tiltLambda: number;

  vocabulary: VocabularyWord[];
  /** Target share of pathway-score variance, per pathway. Reported against, not asserted. */
  targetVarianceShares: number[];

  attributes: AttributeConfig[];

  /** Key of the attribute the classification is unfairly biased by. */
  biasAttributeKey: string;
  /** Pathway the truth genuinely depends on. */
  truthPathway: number;
  /** Requested misclassification rate among items where the bias attribute is 1. */
  errorRateWhenBiasOn: number;
  /** Requested misclassification rate among items where it is 0. */
  errorRateWhenBiasOff: number;
  /**
   * Spreads classification_probability away from 0.5. Purely cosmetic: it scales
   * the logit and so cannot move the 0.5 decision boundary or any error rate.
   */
  logitScale: number;

  /** Non-attribute sentences mixed into every note. */
  fillerFragments: string[];
  minFillerPerNote: number;
  maxFillerPerNote: number;

  thresholds: Thresholds;
}
