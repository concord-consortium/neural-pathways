import { useEffect, useRef, useState } from "react";
import { fetchIndex } from "./data-loader";
import { DatasetDefinition } from "./datasets/dataset-definition";
import { S3Index } from "./types/s3-data";

export type DatasetIndexState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; index: S3Index };

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

interface CacheEntry {
  promise: Promise<S3Index>;
  /** Set once the promise resolves, so a later mount can start ready. */
  index?: S3Index;
}

/** One fetch per dataset per page load, shared by every view. */
const cache = new Map<string, CacheEntry>();

function load(dataset: DatasetDefinition): CacheEntry {
  const existing = cache.get(dataset.id);
  if (existing) {
    return existing;
  }
  const entry: CacheEntry = { promise: fetchIndex(dataset) };
  entry.promise.then(
    index => {
      entry.index = index;
    },
    () => {
      // Forget a failed fetch, so the next mount tries again.
      if (cache.get(dataset.id) === entry) {
        cache.delete(dataset.id);
      }
    },
  );
  cache.set(dataset.id, entry);
  return entry;
}

interface UseDatasetIndexOptions {
  /**
   * Runs when the index is available to this component, on every mount, even when it was already
   * cached. Views use it to correct the shared conversation against the list that arrived. It
   * doesn't run after the component unmounts.
   */
  onLoaded?: (index: S3Index) => void;
}

function initialState(dataset: DatasetDefinition): DatasetIndexState {
  const index = cache.get(dataset.id)?.index;
  return index ? { status: "ready", index } : { status: "loading" };
}

export function useDatasetIndex(dataset: DatasetDefinition, options?: UseDatasetIndexOptions): DatasetIndexState {
  // Tagged with its dataset, so a change of dataset never shows the previous one's index.
  const [state, setState] = useState(() => ({ datasetId: dataset.id, value: initialState(dataset) }));
  const onLoaded = options?.onLoaded;
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    let active = true;
    load(dataset).promise.then(
      index => {
        if (!active) {
          return;
        }
        try {
          onLoadedRef.current?.(index);
        } catch (error: unknown) {
          setState({ datasetId: dataset.id, value: { status: "error", error: toError(error) } });
          return;
        }
        setState(previous =>
          previous.datasetId === dataset.id && previous.value.status === "ready" && previous.value.index === index
            ? previous
            : { datasetId: dataset.id, value: { status: "ready", index } });
      },
      (error: unknown) => {
        if (active) {
          setState({ datasetId: dataset.id, value: { status: "error", error: toError(error) } });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [dataset]);

  // Until the effect catches up with a new dataset, show that dataset's cached index or loading.
  return state.datasetId === dataset.id ? state.value : initialState(dataset);
}

/** Tests only: forget every loaded index. */
export function clearDatasetIndexCache(): void {
  cache.clear();
}
