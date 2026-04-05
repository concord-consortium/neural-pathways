import {
  S3Index, S3FaFit, ActivationBucket, S3ShapBucket, ReviewShapData,
} from "./types/s3-data";
import { Pathways, Scaler, Metadata } from "../heatmap/types/viz-data";

export const BASE_URL = "https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/";

export async function fetchIndex(): Promise<S3Index> {
  const response = await fetch(`${BASE_URL}index.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch index: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchActivations(
  reviewId: string,
  cache: Map<string, ActivationBucket>,
): Promise<number[]> {
  const bucket = reviewId.slice(0, 2);
  if (!cache.has(bucket)) {
    const response = await fetch(`${BASE_URL}activations/${bucket}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch activations bucket ${bucket}: ${response.status} ${response.statusText}`);
    }
    const data: ActivationBucket = await response.json();
    cache.set(bucket, data);
  }
  const bucketData = cache.get(bucket)!;
  const review = bucketData.reviews.find(r => r.id === reviewId);
  if (!review) {
    throw new Error(`Review ${reviewId} not found in bucket ${bucket}`);
  }
  return review.activations;
}

export async function fetchShap(
  reviewId: string,
  fitName: string,
  cache: Map<string, S3ShapBucket>,
): Promise<ReviewShapData> {
  const bucket = reviewId.slice(0, 2);
  const cacheKey = `${fitName}/${bucket}`;
  if (!cache.has(cacheKey)) {
    const response = await fetch(`${BASE_URL}shap/${fitName}/${bucket}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SHAP bucket ${cacheKey}: ${response.status} ${response.statusText}`);
    }
    const data: S3ShapBucket = await response.json();
    cache.set(cacheKey, data);
  }
  const bucketData = cache.get(cacheKey)!;
  const review = bucketData.reviews.find(r => r.id === reviewId);
  if (!review) {
    throw new Error(`Review ${reviewId} not found in SHAP bucket ${cacheKey}`);
  }
  return {
    words: review.words,
    base_values: review.base_values,
    unmasked_values: review.unmasked_values,
  };
}

export function fitToPathways(fit: S3FaFit): Pathways {
  const nNeurons = fit.loadings[0].length;
  return {
    components: fit.loadings,
    mean: new Array(nNeurons).fill(0),
    noise_variance: fit.noise_variance,
  };
}

export function fitToScaler(fit: S3FaFit): Scaler {
  return { mean: fit.scaler_mean, scale: fit.scaler_scale };
}

export function fitToMetadata(fit: S3FaFit): Metadata {
  return {
    n_neurons: fit.loadings[0].length,
    n_pathways: fit.n_pathways,
    explained_variance_total: fit.explained_variance_total,
    explained_variance_per_pathway: fit.explained_variance_per_pathway,
  };
}

export function standardizeActivations(
  raw: number[], scalerMean: number[], scalerScale: number[],
): number[] {
  return raw.map((v, i) => (v - scalerMean[i]) / scalerScale[i]);
}
