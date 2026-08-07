import { S3Review } from "../../shared/types/s3-data";
import { DatasetConfig } from "../../shared/datasets/dataset-config";

export interface FlatReview {
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

export function flattenReview(
  review: S3Review,
  fitName: string,
  dataset: DatasetConfig,
): FlatReview {
  const scores = review.pathway_scores[fitName] ?? [];
  const flat: FlatReview = {
    text: review.text,
    target_label: review.target_label,
    name: review.name,
    city: review.city,
    state: review.state,
    stars: review.stars,
    review_stars: review.review_stars,
    categories: review.categories,
    reconstruction_r2: review.reconstruction_r2[fitName] ?? 0,
    has_word_scores: review.has_shap?.includes(fitName) ?? false,
  };
  if (review.classification != null) {
    flat.classification_label = review.classification === 1 ? "positive" : "negative";
    flat.classification_probability = review.classification_probability;
  }
  for (let i = 0; i < scores.length; i++) {
    flat[`pathway_${i}`] = scores[i];
  }
  // Attributes are written last. An attribute may deliberately alias an existing
  // numeric field (stars, review_stars); the value is identical, so this is a no-op.
  for (const attr of dataset.attributes) {
    const value = dataset.getAttributeValue(review, attr.key);
    if (value != null) {
      flat[attr.key] = value;
    }
  }
  return flat;
}
