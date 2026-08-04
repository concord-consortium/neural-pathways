import { S3Index, S3Item } from "../types/s3-data";
import { AttributeDefinition } from "../types/attributes";

export interface DatasetConfig {
  id: string;
  label: string;
  baseUrl: string;
  itemNoun: { singular: string; plural: string };
  classificationLabels: Record<number, string>;
  searchPlaceholder: string;
  /** Help rows for fields only this dataset has. */
  searchFields: { name: string; description: string }[];
  resolveAttributes(index: S3Index): AttributeDefinition[];
  /** Returns null when the attribute does not apply to this item. */
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

/**
 * Everything the index declares, hidden attributes included. Built once per
 * load, in the fetch effect, because resolveAttributes validates a list that —
 * for a generated dataset — arrived over the network, and can throw.
 */
export interface LoadedDataset {
  config: DatasetConfig;
  allAttributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

/**
 * A loaded dataset narrowed to what the student can currently see.
 *
 * `attributes` means VISIBLE. Every UI surface reads it, which is what makes
 * hiding total without those surfaces knowing hiding exists. `allAttributes` has
 * exactly one legitimate consumer, the codings dialog; reaching for it anywhere
 * else hands a student the answer.
 */
export interface ActiveDataset {
  config: DatasetConfig;
  attributes: AttributeDefinition[];
  allAttributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

export const NO_COMMISSIONS: ReadonlySet<string> = new Set<string>();

export function activateDataset(config: DatasetConfig, index: S3Index): LoadedDataset {
  return {
    config,
    allAttributes: config.resolveAttributes(index),
    getAttributeValue: (item, key) => config.getAttributeValue(item, key),
  };
}

/** Pure and total: unknown commissioned keys are inert, and this never throws. */
export function applyCommissions(
  loaded: LoadedDataset,
  commissioned: ReadonlySet<string>,
): ActiveDataset {
  return {
    config: loaded.config,
    attributes: loaded.allAttributes.filter(
      attribute => attribute.hidden !== true || commissioned.has(attribute.key),
    ),
    allAttributes: loaded.allAttributes,
    getAttributeValue: loaded.getAttributeValue,
  };
}

/**
 * The attributes that participate in the commissioning fiction. Still returns a
 * commissioned attribute — `hidden` describes the data, commissioning is app
 * state — so the dialog can show it as done rather than losing track of it.
 */
export function codeableAttributes(attributes: AttributeDefinition[]): AttributeDefinition[] {
  return attributes.filter(attribute => attribute.hidden === true);
}

/** Sentence-initial and heading use of a lowercase item noun. */
export function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
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
