import { AttributeDefinition } from "./attributes";

// --- S3 Index & Fit Types ---

/**
 * The index as the application uses it. The JSON on the wire calls this array
 * `reviews`; fetchIndex renames it once so nothing downstream has to know that
 * the format predates the app carrying more than one kind of item.
 */
export interface S3Index {
  metadata: {
    fa_fits: Record<string, S3FaFit>;
    review_sets: Record<string, { count: number; description: string }>;
    /** Present on generated datasets that carry externally coded attributes. */
    attributes?: AttributeDefinition[];
  };
  items: S3Item[];
}

/**
 * The five activation-model fields are optional so a dataset without neuron
 * activations can still declare a fit. Every shipped dataset now carries them —
 * the yelp pipeline fits 780 neurons, the alien generator constructs 14 — but
 * keeping them optional means the heatmap-only readers in data-loader.ts fail
 * loudly on a fit that lacks them instead of silently reading undefined.
 */
export interface S3FaFit {
  source_split: string;
  n_pathways: number;
  explained_variance_total?: number;
  explained_variance_per_pathway: number[];
  pathway_importance: number[];
  loadings?: number[][];       // n_pathways x neuron_count
  noise_variance?: number[];   // neuron_count
  scaler_mean?: number[];      // neuron_count
  scaler_scale?: number[];     // neuron_count
  pathway_score_min: number[]; // n_pathways
  pathway_score_max: number[]; // n_pathways
}

export interface S3Item {
  id: string;
  sources: Record<string, number[]>;
  text: string;
  target: number | null;
  target_label: string | null;
  name?: string;
  city?: string;
  state?: string;
  stars?: number;
  review_stars?: number;
  categories?: string;
  /** An observer's written note about this item. Generated datasets only. */
  observation?: string;
  /** Externally coded attribute values, keyed by attribute key. */
  attributes?: Record<string, number>;
  pathway_scores: Record<string, number[]>;
  /** Per fit. Absent only on a dataset with no activations to reconstruct. */
  reconstruction_r2?: Record<string, number>;
  pathway_variance_fractions: Record<string, number[]>;
  has_shap?: string[];
  classification?: number;
  classification_probability?: number;
}

// --- Activation Types (heatmap) ---

/**
 * An activation bucket as the application uses it. The JSON on the wire calls
 * this array `reviews`; fetchActivations renames it once so nothing downstream
 * has to know that the format predates the app carrying more than one kind of
 * item.
 */
export interface ActivationBucket {
  items: { id: string; activations: number[] }[];
}

// --- SHAP Types (explorer) ---

/**
 * A SHAP bucket as the application uses it. The JSON on the wire calls this
 * array `reviews`; fetchShap renames it once so nothing downstream has to know
 * that the format predates the app carrying more than one kind of item.
 */
export interface S3ShapBucket {
  items: S3ShapItem[];
}

export interface S3ShapItem {
  id: string;
  base_values: number[];
  unmasked_values: number[];
  words: { word: string; scores: number[] }[];
}

export interface ItemShapData {
  words: { word: string; scores: number[] }[];
  base_values: number[];
  unmasked_values: number[];
}
