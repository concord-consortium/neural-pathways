import { useEffect, useState } from "react";
import { fetchShap } from "./data-loader";
import { DatasetDefinition } from "./datasets/dataset-definition";
import { S3Item, S3ShapBucket } from "./types/s3-data";
import { alignWordScores } from "./word-scores";

export type WordScoresState =
  | { status: "loading" }
  /** `failed` says which part failed: the fetch, or lining the scores up with the message. */
  | { status: "error"; error: Error; failed: "load" | "show" }
  /** `scores` is `[word][pathway]`, one row per word of the message. */
  | { status: "ready"; scores: number[][] };

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** The loaded SHAP buckets, one Map per dataset, so a bucket that has loaded isn't fetched again. */
const bucketCaches = new Map<string, Map<string, S3ShapBucket>>();

function bucketCache(dataset: DatasetDefinition): Map<string, S3ShapBucket> {
  let cache = bucketCaches.get(dataset.id);
  if (!cache) {
    cache = new Map();
    bucketCaches.set(dataset.id, cache);
  }
  return cache;
}

/** Loads a message's word scores under a fit, lined up with the message's words. */
export function useWordScores(dataset: DatasetDefinition, fitName: string, item: S3Item): WordScoresState {
  const key = `${dataset.id}/${fitName}/${item.id}`;
  // Tagged with its message, so a change of message never shows the previous one's scores.
  const [state, setState] = useState<{ key: string; value: WordScoresState }>(
    () => ({ key, value: { status: "loading" } }));
  const { id, text } = item;

  useEffect(() => {
    let active = true;
    fetchShap(dataset, id, fitName, bucketCache(dataset)).then(
      shap => {
        if (!active) {
          return;
        }
        try {
          setState({ key, value: { status: "ready", scores: alignWordScores(text, shap.words) } });
        } catch (error: unknown) {
          setState({ key, value: { status: "error", error: toError(error), failed: "show" } });
        }
      },
      (error: unknown) => {
        if (active) {
          setState({ key, value: { status: "error", error: toError(error), failed: "load" } });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [dataset, fitName, id, text, key]);

  return state.key === key ? state.value : { status: "loading" };
}

/** Tests only: forget every loaded SHAP bucket. */
export function clearWordScoresCache(): void {
  bucketCaches.clear();
}
