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

export async function fetchIndex(dataset: DatasetDefinition): Promise<S3Index> {
  const response = await fetch(dataUrl(dataset.baseUrl, "index.json"));
  if (!response.ok) {
    throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
  }
  const wire: S3IndexWire = await response.json();
  return { metadata: wire.metadata, items: wire.reviews };
}

export async function fetchActivations(
  dataset: DatasetDefinition,
  itemId: string,
  cache: Map<string, ActivationBucket>,
): Promise<number[]> {
  const bucket = itemId.slice(0, 2);
  if (!cache.has(bucket)) {
    const response = await fetch(dataUrl(dataset.baseUrl, `activations/${bucket}.json`));
    if (!response.ok) {
      throw new Error(`Failed to fetch activations bucket ${bucket}: ${response.status} ${response.statusText}`);
    }
    const wire: ActivationBucketWire = await response.json();
    cache.set(bucket, { items: wire.reviews });
  }
  const bucketData = cache.get(bucket)!;
  const item = bucketData.items.find(r => r.id === itemId);
  if (!item) {
    throw new Error(`Review ${itemId} not found in bucket ${bucket}`);
  }
  return item.activations;
}

export async function fetchShap(
  dataset: DatasetDefinition,
  itemId: string,
  fitName: string,
  cache: Map<string, S3ShapBucket>,
): Promise<ItemShapData> {
  const bucket = itemId.slice(0, 2);
  const cacheKey = `${fitName}/${bucket}`;
  if (!cache.has(cacheKey)) {
    const response = await fetch(dataUrl(dataset.baseUrl, `shap/${fitName}/${bucket}.json`));
    if (!response.ok) {
      throw new Error(`Failed to fetch SHAP bucket ${cacheKey}: ${response.status} ${response.statusText}`);
    }
    const wire: S3ShapBucketWire = await response.json();
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
