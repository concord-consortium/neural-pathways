import { DatasetDefinition } from "../../../core/datasets/dataset-definition";
import {
  alien3Dataset as alien3Definition, createAlienDataset,
} from "../../../core/datasets/alien3-dataset";
import { DatasetConfig } from "./dataset-config";

/**
 * Adds the explorer's search help to a core alien definition. Every other
 * field these datasets have beyond the shared ones is an attribute, and the help
 * dialog lists those separately. R² became real for the alien datasets once the
 * generator emitted neuron activations (NPW-18).
 */
function withAlienSearch(definition: DatasetDefinition): DatasetConfig {
  return {
    ...definition,
    searchPlaceholder: "voices_raised:1 AND pathway_0:>1",
    searchFields: [
      { name: "reconstruction_r2", description: "Reconstruction R²" },
    ],
  };
}

export const alienDataset = withAlienSearch(createAlienDataset({
  id: "alien",
  label: "Alien Conversations (4 pathways)",
  baseUrl: "alien-data/",
}));

export const alien3Dataset = withAlienSearch(alien3Definition);
