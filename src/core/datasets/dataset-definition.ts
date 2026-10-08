import { S3Index, S3Item } from "../types/s3-data";
import { AttributeDefinition } from "../types/attributes";

/**
 * What a dataset is, independent of any one tool's UI: where its files live,
 * what its items are called, and how to read attributes off an item.
 */
export interface DatasetDefinition {
  id: string;
  label: string;
  /**
   * Relative to the build root, with no leading slash, or an absolute URL.
   * Resolved by dataUrl (src/core/data-url.ts) at fetch time.
   */
  baseUrl: string;
  itemNoun: { singular: string; plural: string };
  classificationLabels: Record<number, string>;
  resolveAttributes(index: S3Index): AttributeDefinition[];
  /** Returns null when the attribute does not apply to this item. */
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

/**
 * Search field names an attribute key must not shadow, because the existing
 * field holds a different kind of value than an attribute would. It covers the
 * lab explorer's search fields and the core filter's fixed fields.
 *
 * `stars` and `review_stars` are deliberately absent: they are numeric fields
 * whose values an attribute may legitimately alias. See
 * src/lab/shared/datasets/yelp-dataset.ts. Such an alias MUST derive the
 * identical value as the search field it shadows — nothing here enforces that,
 * so a future dataset config that aliased one of these names with a different
 * value would silently change search semantics.
 */
export const RESERVED_FIELD_NAMES = [
  "text",
  "target_label",
  // The core filter's other fixed fields (FIXED_FIELDS in src/core/filter/conversation-filter.ts).
  "n",
  "id",
  "observation",
  "name",
  "city",
  "state",
  "categories",
  "reconstruction_r2",
  "has_word_scores",
  "classification_label",
  "classification_probability",
  "pathway_prediction",
  "pathway_prediction_label",
  "pathway_prediction_matches",
];

const PATHWAY_FIELD_PATTERN = /^pathway_\d+$/;

export function validateAttributeKeys(attributes: AttributeDefinition[]): void {
  const seen = new Set<string>();
  for (const attr of attributes) {
    if (RESERVED_FIELD_NAMES.includes(attr.key)) {
      throw new Error(`Attribute key "${attr.key}" collides with a reserved search field name`);
    }
    if (PATHWAY_FIELD_PATTERN.test(attr.key)) {
      throw new Error(`Attribute key "${attr.key}" collides with the reserved pathway_<n> pattern`);
    }
    if (seen.has(attr.key)) {
      throw new Error(`Duplicate attribute key "${attr.key}"`);
    }
    seen.add(attr.key);
  }
}
