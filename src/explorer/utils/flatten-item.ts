import { S3Item } from "../../shared/types/s3-data";
import { DatasetConfig } from "../../shared/datasets/dataset-config";

export interface FlatItem {
  text: string;
  target_label: string | null;
  name?: string;
  city?: string;
  state?: string;
  stars?: number;
  review_stars?: number;
  categories?: string;
  reconstruction_r2: number;
  has_word_scores: boolean;
  classification_label?: string;
  classification_probability?: number;
  // Pathway scores (pathway_0, pathway_1, ...) and attribute values are added
  // dynamically, so the index signature covers every value type used above.
  [key: string]: string | number | boolean | null | undefined;
}

export function flattenItem(
  item: S3Item,
  fitName: string,
  dataset: DatasetConfig,
): FlatItem {
  const scores = item.pathway_scores[fitName] ?? [];
  const flat: FlatItem = {
    text: item.text,
    target_label: item.target_label,
    name: item.name,
    city: item.city,
    state: item.state,
    stars: item.stars,
    review_stars: item.review_stars,
    categories: item.categories,
    reconstruction_r2: item.reconstruction_r2?.[fitName] ?? 0,
    has_word_scores: item.has_shap?.includes(fitName) ?? false,
  };
  if (item.classification != null) {
    flat.classification_label = item.classification === 1 ? "positive" : "negative";
    flat.classification_probability = item.classification_probability;
  }
  for (let i = 0; i < scores.length; i++) {
    flat[`pathway_${i}`] = scores[i];
  }
  // Attributes are written last. An attribute may deliberately alias an existing
  // numeric field (stars, review_stars); the value is identical, so this is a no-op.
  for (const attr of dataset.attributes) {
    const value = dataset.getAttributeValue(item, attr.key);
    if (value != null) {
      flat[attr.key] = value;
    }
  }
  return flat;
}
