import { S3Index, S3Item } from "../../../core/types/s3-data";
import { AttributeDefinition } from "../../../core/types/attributes";
import { DatasetDefinition } from "../../../core/datasets/dataset-definition";

/** A dataset as the explorer and heatmap use it: the core definition plus search help. */
export interface DatasetConfig extends DatasetDefinition {
  searchPlaceholder: string;
  /** Help rows for fields only this dataset has. */
  searchFields: { name: string; description: string }[];
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
