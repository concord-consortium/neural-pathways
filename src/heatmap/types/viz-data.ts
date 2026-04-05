export interface Metadata {
  n_neurons: number;
  n_pathways: number;
  explained_variance_total: number;
  explained_variance_per_pathway: number[];
}

export interface Pathways {
  components: number[][];  // n_pathways x n_neurons
  mean: number[];          // n_neurons
  noise_variance: number[];
}

export interface Scaler {
  mean: number[];
  scale: number[];
}


// --- S3 Data Types ---

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
  loadings: number[][];       // n_pathways x 780
  noise_variance: number[];   // 780
  scaler_mean: number[];      // 780
  scaler_scale: number[];     // 780
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
}

export interface ActivationBucket {
  reviews: Array<{ id: string; activations: number[] }>;
}
