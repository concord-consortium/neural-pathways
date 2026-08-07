import { AttributeType } from "../../shared/types/attributes";

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

export type ViewMode = "explore" | "correlations";

/**
 * One column of numbers aligned across a review list — either an external
 * attribute or a pathway. The correlation matrix treats both uniformly, which
 * is what lets a single grid cover attribute x pathway, attribute x attribute,
 * and pathway x pathway.
 */
export interface Series {
  key: string;
  label: string;
  kind: "attribute" | "pathway";
  /** Present only for attributes; describes how the dataset declares the values. */
  attributeType?: AttributeType;
  /**
   * Display labels for individual values, carried from the attribute definition.
   * Absent for pathways and for attributes whose numbers speak for themselves;
   * consumers fall back to the raw value.
   */
  valueLabels?: Record<number, string>;
  description: string;
  /** One entry per review, aligned by index. null means missing. */
  values: (number | null)[];
}
