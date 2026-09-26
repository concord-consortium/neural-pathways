import { DatasetConfig } from "./dataset-config";
import { yelpDataset } from "./yelp-dataset";
import { alien3Dataset, alienDataset } from "./alien-dataset";

export const DATASETS: Record<string, DatasetConfig> = {
  [yelpDataset.id]: yelpDataset,
  [alienDataset.id]: alienDataset,
  [alien3Dataset.id]: alien3Dataset,
};

/**
 * Yelp stays the default so a bare explorer URL keeps its current meaning. The
 * alien data is untuned until phase 7.
 */
export const DEFAULT_DATASET_ID = yelpDataset.id;

// Derived from DATASETS (rather than a second hand-maintained array) so a
// dataset added to one list cannot be forgotten in the other: declaration
// order in the object literal above gives Yelp, then the two alien datasets.
export const DATASET_LIST: DatasetConfig[] = Object.values(DATASETS);

/** An unknown id falls back to the default: a mistyped link should show something. */
export function datasetFromId(id: string | undefined): DatasetConfig {
  return (id && DATASETS[id]) || DATASETS[DEFAULT_DATASET_ID];
}
