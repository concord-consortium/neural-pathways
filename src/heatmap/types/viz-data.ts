export interface NeuronLayer {
  name: string;
  start: number;
  size: number;
}

export interface Metadata {
  n_neurons: number;
  n_pathways: number;
  explained_variance_total: number;
  explained_variance_per_pathway: number[];
  neuron_layers: NeuronLayer[];
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

export interface Review {
  index: number;
  source?: string;
  text: string;
  target: number;
  target_label: string;
  activations_raw: number[];
  activations_standardized: number[];
  pathway_scores: number[];
  reconstruction_r2?: number;
}

export interface VizData {
  metadata: Metadata;
  pathways: Pathways;
  scaler: Scaler;
  reviews: Review[];
}
