import {
  S3Index, S3Item, ActivationBucket, S3ShapBucket, S3ShapItem, ItemShapData,
} from "./types/s3-data";
import { DatasetDefinition } from "./datasets/dataset-definition";
import { dataUrl } from "./data-url";

/** The shape index.json actually has. Only this module names it. */
interface S3IndexWire {
  metadata: S3Index["metadata"];
  reviews: S3Item[];
}

/** The shape an activations bucket JSON file actually has. Only this module names it. */
interface ActivationBucketWire {
  reviews: { id: string; activations: number[] }[];
}

/** The shape a SHAP bucket JSON file actually has. Only this module names it. */
interface S3ShapBucketWire {
  reviews: S3ShapItem[];
}

/**
 * Fetches one data file and checks it has the `reviews` array every wire shape
 * carries, so a malformed bucket is never cached. Every error names the URL,
 * because on a broken deploy the URL is what needs checking.
 */
async function fetchWire<T extends { reviews: unknown[] }>(url: string): Promise<T> {
  let wire: T;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    wire = await response.json();
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!Array.isArray(wire?.reviews)) {
    throw new Error(`${url} has no reviews array`);
  }
  return wire;
}

export async function fetchIndex(dataset: DatasetDefinition): Promise<S3Index> {
  const wire = await fetchWire<S3IndexWire>(dataUrl(dataset.baseUrl, "index.json"));
  return { metadata: wire.metadata, items: wire.reviews };
}

/**
 * `cache` is keyed by bucket, not by dataset: give each dataset its own Map, and
 * replace it when the dataset changes.
 */
export async function fetchActivations(
  dataset: DatasetDefinition,
  itemId: string,
  cache: Map<string, ActivationBucket>,
): Promise<number[]> {
  const bucket = itemId.slice(0, 2);
  if (!cache.has(bucket)) {
    const wire = await fetchWire<ActivationBucketWire>(dataUrl(dataset.baseUrl, `activations/${bucket}.json`));
    cache.set(bucket, { items: wire.reviews });
  }
  const bucketData = cache.get(bucket)!;
  const item = bucketData.items.find(r => r.id === itemId);
  if (!item) {
    throw new Error(`Review ${itemId} not found in bucket ${bucket}`);
  }
  return item.activations;
}

/**
 * `cache` is keyed by fit and bucket, not by dataset: give each dataset its own
 * Map, and replace it when the dataset changes.
 */
export async function fetchShap(
  dataset: DatasetDefinition,
  itemId: string,
  fitName: string,
  cache: Map<string, S3ShapBucket>,
): Promise<ItemShapData> {
  const bucket = itemId.slice(0, 2);
  const cacheKey = `${fitName}/${bucket}`;
  if (!cache.has(cacheKey)) {
    const wire = await fetchWire<S3ShapBucketWire>(dataUrl(dataset.baseUrl, `shap/${fitName}/${bucket}.json`));
    cache.set(cacheKey, { items: wire.reviews });
  }
  const bucketData = cache.get(cacheKey)!;
  const item = bucketData.items.find(r => r.id === itemId);
  if (!item) {
    throw new Error(`Review ${itemId} not found in SHAP bucket ${cacheKey}`);
  }
  return {
    words: item.words,
    base_values: item.base_values,
    unmasked_values: item.unmasked_values,
  };
}
