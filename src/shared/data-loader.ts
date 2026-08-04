import {
  S3Index, S3Item, S3FaFit, ActivationBucket, S3ShapBucket, S3ShapItem, ItemShapData,
} from "./types/s3-data";
import { Pathways, Scaler, Metadata } from "../heatmap/types/viz-data";

export const BASE_URL = "https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/";

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

export async function fetchIndex(): Promise<S3Index> {
  const response = await fetch(`${BASE_URL}index.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
  }
  const wire: S3IndexWire = await response.json();
  return { metadata: wire.metadata, items: wire.reviews };
}

export async function fetchActivations(
  itemId: string,
  cache: Map<string, ActivationBucket>,
): Promise<number[]> {
  const bucket = itemId.slice(0, 2);
  if (!cache.has(bucket)) {
    const response = await fetch(`${BASE_URL}activations/${bucket}.json`);
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
  itemId: string,
  fitName: string,
  cache: Map<string, S3ShapBucket>,
): Promise<ItemShapData> {
  const bucket = itemId.slice(0, 2);
  const cacheKey = `${fitName}/${bucket}`;
  if (!cache.has(cacheKey)) {
    const response = await fetch(`${BASE_URL}shap/${fitName}/${bucket}.json`);
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

/**
 * These three functions feed the heatmap, which visualizes the 780-neuron
 * activation model. A fit without that model cannot answer them, and returning
 * empty arrays would draw an empty heatmap that looks like real data.
 */
function requireActivationModel<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Fit has no activation model: "${field}" is absent`);
  }
  return value;
}

export function fitToPathways(fit: S3FaFit): Pathways {
  const loadings = requireActivationModel(fit.loadings, "loadings");
  const nNeurons = loadings[0].length;
  return {
    components: loadings,
    mean: new Array(nNeurons).fill(0),
    noise_variance: requireActivationModel(fit.noise_variance, "noise_variance"),
  };
}

export function fitToScaler(fit: S3FaFit): Scaler {
  return {
    mean: requireActivationModel(fit.scaler_mean, "scaler_mean"),
    scale: requireActivationModel(fit.scaler_scale, "scaler_scale"),
  };
}

export function fitToMetadata(fit: S3FaFit): Metadata {
  const loadings = requireActivationModel(fit.loadings, "loadings");
  return {
    n_neurons: loadings[0].length,
    n_pathways: fit.n_pathways,
    explained_variance_total: requireActivationModel(fit.explained_variance_total, "explained_variance_total"),
    explained_variance_per_pathway: fit.explained_variance_per_pathway,
  };
}

export function standardizeActivations(
  raw: number[], scalerMean: number[], scalerScale: number[],
): number[] {
  return raw.map((v, i) => (v - scalerMean[i]) / scalerScale[i]);
}
