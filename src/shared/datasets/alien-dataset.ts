import { S3Index, S3Item } from "../types/s3-data";
import { AttributeDefinition } from "../types/attributes";
import { DatasetConfig, validateAttributeKeys } from "./dataset-config";

/**
 * The generator emits nine coded attributes but not these two, and
 * model_correct is what makes the planted bias findable at all — filtering to
 * the model's errors and seeing which group they land on is the whole activity.
 * Both are derived here exactly as the Yelp config derives its own.
 */
const derivedAttributes: AttributeDefinition[] = [
  {
    key: "target",
    label: "Actual answer",
    description: "Whether this really was a good time to approach: 1 for approach, 0 for wait. "
      + "This is the ground truth the model was trying to predict.",
    type: "binary",
    valueLabels: { 0: "wait", 1: "approach" },
  },
  {
    key: "model_correct",
    label: "Model was correct",
    description: "Whether the model's prediction matched the actual answer. Only defined for "
      + "conversations that have both a prediction and a ground-truth answer.",
    type: "binary",
    valueLabels: { 0: "no", 1: "yes" },
  },
];

export const alienDataset: DatasetConfig = {
  id: "alien",
  label: "Alien Conversations",
  // Relative, no leading slash: deployed pages live under .../branch/<name>/ and
  // the generated data is published alongside them.
  baseUrl: "alien-data/",
  itemNoun: { singular: "conversation", plural: "conversations" },
  classificationLabels: { 0: "wait", 1: "approach" },
  searchPlaceholder: "voices_raised:1 AND pathway_0:>1",
  // Every field this dataset has beyond the shared ones is an attribute, and the
  // help dialog lists those separately.
  searchFields: [],

  resolveAttributes(index: S3Index): AttributeDefinition[] {
    // The generated definitions arrive over the network, so they are validated
    // here rather than at module load. A generated key that collided with a
    // reserved search field or with a derived attribute fails loudly instead of
    // silently shadowing it.
    const merged = [...derivedAttributes, ...(index.metadata.attributes ?? [])];
    validateAttributeKeys(merged);
    return merged;
  },

  getAttributeValue(item: S3Item, key: string): number | null {
    switch (key) {
      case "target":
        return item.target;
      case "model_correct":
        if (item.classification == null || item.target == null) return null;
        return item.classification === item.target ? 1 : 0;
      default:
        return item.attributes?.[key] ?? null;
    }
  },
};
