export interface WordEffect {
  word: string;
  scores: number[];
}

export interface ExplorerReview {
  index: number;
  source: string;
  text: string;
  target: number;
  target_label: string;
  pathway_scores: number[];
  reconstruction_r2: number;
  pathway_variance_fractions: number[];
  name: string;
  city: string;
  state: string;
  stars: number;
  review_stars: number;
  categories: string;
  rating: string;
  words?: WordEffect[];
  base_values?: number[];
  unmasked_values?: number[];
}

export interface ExplorerData {
  metadata: {
    n_neurons: number;
    n_pathways: number;
    explained_variance_total: number;
    explained_variance_per_pathway: number[];
    n_reviews: number;
    word_effect_metric?: Record<string, unknown>;
    data_sources: Record<string, unknown>;
  };
  reviews: ExplorerReview[];
}

export type ScaleMode = "shared" | "per-pathway";

export interface ScaleExtents {
  shared: [number, number];
  perPathway: [number, number][];
}
