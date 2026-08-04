import { S3Item } from "../types/s3-data";
import { AttributeDefinition } from "../types/attributes";

export interface DatasetConfig {
  id: string;
  label: string;
  attributes: AttributeDefinition[];
  /** Returns null when the attribute does not apply to this item. */
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

/**
 * Search field names an attribute key must not shadow, because the existing
 * field holds a different kind of value than an attribute would.
 *
 * `stars` and `review_stars` are deliberately absent: they are numeric fields
 * whose values an attribute may legitimately alias. See yelp-dataset.ts. Such an
 * alias MUST derive the identical value as the search field it shadows — nothing
 * here enforces that, so a future dataset config that aliased one of these names
 * with a different value would silently change search semantics.
 */
export const RESERVED_FIELD_NAMES = [
  "text",
  "target_label",
  "name",
  "city",
  "state",
  "categories",
  "reconstruction_r2",
  "has_word_scores",
  "classification_label",
  "classification_probability",
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
