export interface WordEffect {
  word: string;
  scores: number[];
}

export type ScaleMode = "shared" | "per-pathway";

export type WordColorMode = "score" | "impact";

export type WordScaleScope = "per-pathway" | "full-review";

export interface ScaleExtents {
  shared: [number, number];
  perPathway: [number, number][];
}
