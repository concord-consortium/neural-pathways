import { DatasetConfig } from "./dataset-config";
import { yelpDataset } from "./yelp-dataset";
import { alienDataset } from "./alien-dataset";

export const DATASETS: Record<string, DatasetConfig> = {
  [yelpDataset.id]: yelpDataset,
  [alienDataset.id]: alienDataset,
};

/**
 * Yelp stays the default so a bare explorer URL keeps its current meaning. The
 * alien data is untuned until phase 7.
 */
export const DEFAULT_DATASET_ID = yelpDataset.id;

export const DATASET_LIST: DatasetConfig[] = [yelpDataset, alienDataset];

/** An unknown id falls back to the default: a mistyped link should show something. */
export function datasetFromId(id: string | undefined): DatasetConfig {
  return (id && DATASETS[id]) || DATASETS[DEFAULT_DATASET_ID];
}
