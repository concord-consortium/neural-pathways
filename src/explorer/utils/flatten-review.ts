import { S3Review } from "../../shared/types/s3-data";

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
  [key: `pathway_${number}`]: number;
}

export function flattenReview(review: S3Review, fitName: string): FlatReview {
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
  };
  for (let i = 0; i < scores.length; i++) {
    flat[`pathway_${i}`] = scores[i];
  }
  return flat;
}
