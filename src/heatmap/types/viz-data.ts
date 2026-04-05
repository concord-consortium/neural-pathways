// Heatmap component-facing types
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

// Re-export S3 types for backwards compatibility
export { S3Index, S3FaFit, S3Review, ActivationBucket } from "../../shared/types/s3-data";
