import { S3Index, S3Item } from "../types/s3-data";
import { Network } from "../network/network";
import { AttributeDefinition } from "../types/attributes";
import { DatasetDefinition, validateAttributeKeys } from "./dataset-definition";

/**
 * The label space this dataset's binary outcome lives in, shared by the three
 * declarations that must agree: the ground truth (`target`), what the model said
 * (`prediction`), and the confidence badge in the item panel
 * (`classificationLabels`, below). The classifier predicts the same space the
 * target is drawn from, so one constant is the honest way to say it — written
 * out three times they can drift, and the drift would be visible: the fields
 * view's axis would disagree with the badge sitting above it.
 */
const CLASSIFICATION_LABELS = { 0: "wait", 1: "approach" };

/**
 * The generator emits nine coded attributes but not these three, and
 * model_correct is what makes the planted bias findable at all — filtering to
 * the model's errors and seeing which group they land on is the whole activity.
 * All three are derived here exactly as the Yelp config derives its own.
 */
const derivedAttributes: AttributeDefinition[] = [
  {
    key: "target",
    label: "Actual answer",
    description: "Whether this really was a good time to approach: 1 for approach, 0 for wait. "
      + "This is the ground truth the model was trying to predict.",
    type: "binary",
    valueLabels: CLASSIFICATION_LABELS,
  },
  {
    key: "prediction",
    label: "Predicted answer",
    description: "What the model predicted for this conversation: 1 for approach, 0 for wait. "
      + "Only defined for conversations the model has scored.",
    type: "binary",
    valueLabels: CLASSIFICATION_LABELS,
    excludeFromRegression: true,
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

export interface AlienDatasetParams {
  id: string;
  label: string;
  /** Relative (see DatasetDefinition.baseUrl). */
  baseUrl: string;
}

/**
 * The alien datasets differ only in which generated directory they read and what
 * they are called. How many pathways a dataset has is declared by the generated
 * metadata (`n_pathways`), not here, so one factory covers every alien dataset.
 */
export function createAlienDataset({ id, label, baseUrl }: AlienDatasetParams): DatasetDefinition {
  return {
    id,
    label,
    baseUrl,
    itemNoun: { singular: "conversation", plural: "conversations" },
    classificationLabels: CLASSIFICATION_LABELS,

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
        case "prediction":
          return item.classification ?? null;
        case "model_correct":
          if (item.classification == null || item.target == null) return null;
          return item.classification === item.target ? 1 : 0;
        default:
          return item.attributes?.[key] ?? null;
      }
    },
  };
}

/** The lesson's dataset (see doc/datasets.md). */
export const alien3Dataset = createAlienDataset({
  id: "alien3",
  label: "Alien Conversations (3 pathways)",
  baseUrl: "alien-data-3/",
});

/** The network the generator fitted to the alien3 data. Throws when the index has none. */
export function alien3Network(index: S3Index): Network {
  const { network } = index.metadata;
  if (!network) {
    throw new Error("The alien3 data has no network. Run npm run generate:alien to generate it.");
  }
  return network;
}

/** The alien3 fit's loadings, [neuron][pathway]. Throws unless the index has exactly one fit, with loadings. */
export function alien3Loadings(index: S3Index): number[][] {
  const fits = Object.values(index.metadata.fa_fits);
  const loadings = fits.length === 1 ? fits[0].loadings : undefined;
  if (!loadings) {
    throw new Error("The alien3 data has no loadings. Run npm run generate:alien to generate it.");
  }
  return loadings[0].map((_, neuron) => loadings.map(row => row[neuron]));
}
