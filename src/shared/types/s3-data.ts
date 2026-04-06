// --- S3 Index & Fit Types ---

export interface S3Index {
  metadata: {
    fa_fits: Record<string, S3FaFit>;
    review_sets: Record<string, { count: number; description: string }>;
  };
  reviews: S3Review[];
}

export interface S3FaFit {
  source_split: string;
  n_pathways: number;
  explained_variance_total: number;
  explained_variance_per_pathway: number[];
  pathway_importance: number[];
  loadings: number[][];       // n_pathways x 780
  noise_variance: number[];   // 780
  scaler_mean: number[];      // 780
  scaler_scale: number[];     // 780
  pathway_score_min: number[]; // n_pathways
  pathway_score_max: number[]; // n_pathways
}

export interface S3Review {
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
  pathway_scores: Record<string, number[]>;
  reconstruction_r2: Record<string, number>;
  pathway_variance_fractions: Record<string, number[]>;
  has_shap?: string[];
}

// --- Activation Types (heatmap) ---

export interface ActivationBucket {
  reviews: { id: string; activations: number[] }[];
}

// --- SHAP Types (explorer) ---

export interface S3ShapBucket {
  reviews: S3ShapReview[];
}

export interface S3ShapReview {
  id: string;
  base_values: number[];
  unmasked_values: number[];
  words: { word: string; scores: number[] }[];
}

export interface ReviewShapData {
  words: { word: string; scores: number[] }[];
  base_values: number[];
  unmasked_values: number[];
}
