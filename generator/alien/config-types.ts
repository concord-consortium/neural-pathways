import { AttributeType } from "../../src/core/types/attributes";

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
   * valueShares needs at least two, and fragments must be distinguishable across
   * the whole config (see checkFragmentsAreDistinguishable in config-validation.ts).
   */
  notes: Record<number, string[]>;
}

export interface ActivationConfig {
  /**
   * Width of the loading matrix. Factor analysis can only identify k factors
   * from n variables when (n - k)^2 >= n + k; validation enforces it.
   */
  neuronCount: number;
  /** Share of standardized activation variance the pathways carry; the rest is per-neuron noise. */
  explainedVarianceTotal: number;
  /**
   * Each neuron's noise variance is drawn uniformly from this range, then the
   * draws are scaled so their mean is exactly 1 - explainedVarianceTotal.
   */
  noiseVarianceRange: [number, number];
  /** The raw scaler's per-neuron mean and scale are drawn uniformly from these. */
  scalerMeanRange: [number, number];
  scalerScaleRange: [number, number];
}

/** The network fitted to a dataset's activations and classification (generator/alien/network.ts). */
export interface NetworkConfig {
  /** Seeds the network's own RNG, which sets its starting weights. */
  seed: number;
  /**
   * Hidden layer sizes. The first is the embedding, which tracks nothing; each later one tracks the
   * next authored neurons in order, so together they must hold activations.neuronCount units.
   */
  hiddenSizes: number[];
  /**
   * A tracking unit's target is this times its neuron's standardized activation. Below 1, so a
   * typical target sits inside tanh's range.
   */
  targetScale: number;
  /** The loss's weight on the tracking units' squared error. */
  activationWeight: number;
  /** The loss's weight on the cross-entropy against classification. */
  classificationWeight: number;
  /** Adam's step size. */
  learningRate: number;
  /**
   * Fitting stops at the first check where every conversation's logit for its classification beats
   * the other's by this much. The margin keeps a last-bit difference in Math.tanh between Node and a
   * browser from flipping a prediction.
   */
  margin: number;
  /** Epochs between those checks. maxEpochs must be a multiple of it. */
  checkEvery: number;
  /** Fitting stops here whatever the margins; network-reproduces-classification then fails. */
  maxEpochs: number;
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
  /** Smallest |r| between a recovered factor's scores and the authored pathway it matches. */
  faScoreRecoveryMin: number;
  /** Smallest |cosine| between a recovered loading row and the authored one. */
  faLoadingRecoveryMin: number;
  /** Smallest r between a fitted network's tracking unit and the authored neuron it tracks. */
  networkTrackingMin: number;
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
  /**
   * Target share of pathway-score variance, per pathway. The word-sum split is
   * only reported against these; the loading solver gives each pathway exactly
   * this share of the explained variance (see checkActivations in
   * config-validation.ts for why the shares must sum to 1).
   */
  targetVarianceShares: number[];
  activations: ActivationConfig;

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
  /**
   * Fit a network to this dataset (see NetworkConfig). Only a dataset a view draws a network for
   * sets it.
   */
  network?: NetworkConfig;

  /** Non-attribute sentences mixed into every note. */
  fillerFragments: string[];
  minFillerPerNote: number;
  maxFillerPerNote: number;

  thresholds: Thresholds;
}
