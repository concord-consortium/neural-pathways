export type AttributeType = "binary" | "integer" | "float";

/**
 * An external attribute: something an observer coded about an item, held
 * separately from the model's own inputs and outputs.
 */
export interface AttributeDefinition {
  /** Usable directly as a search field name. */
  key: string;
  /** Short human-readable name, shown on chips and in the correlation matrix. */
  label: string;
  /** Paragraph shown on hover and in the search help dialog. */
  description: string;
  type: AttributeType;
  /** Required for "integer" and "float"; ignored for "binary". */
  min?: number;
  max?: number;
  /**
   * Display labels for individual values, e.g. { 0: "negative", 1: "positive" }.
   * Consumers must fall back to the raw value for any value not listed here, so a
   * partial map — or none at all — degrades to showing the number rather than lying.
   */
  valueLabels?: Record<number, string>;
  /**
   * Present in the data but not shown in the explorer until a student
   * commissions it. Written by the dataset generator. `applyCommissions`
   * (shared/datasets/dataset-config.ts) filters a hidden attribute out of
   * `ActiveDataset.attributes` — the list every explorer surface reads —
   * unless its key is in the commissioned set; `codeableAttributes` in the
   * same file uses it to build the Codings dialog's list of attributes a
   * student can commission.
   */
  hidden?: boolean;
}
