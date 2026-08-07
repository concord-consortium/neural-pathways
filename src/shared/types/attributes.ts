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
}
