import { flattenReview } from "./flatten-review";
import { S3Review } from "../../shared/types/s3-data";
import { yelpDataset } from "../../shared/datasets/yelp-dataset";

const makeReview = (overrides: Partial<S3Review> = {}): S3Review => ({
  id: "r1",
  sources: { test: [0] },
  text: "Great pizza and wonderful service",
  target: 1,
  target_label: "positive",
  pathway_scores: { fit_a: [0.8, 0.3, 0.5], fit_b: [0.1, 0.9] },
  reconstruction_r2: { fit_a: 0.91, fit_b: 0.85 },
  pathway_variance_fractions: { fit_a: [0.5, 0.3, 0.2], fit_b: [0.6, 0.4] },
  name: "Joe's Pizza",
  city: "Phoenix",
  state: "AZ",
  stars: 4,
  review_stars: 5,
  categories: "Restaurant, Pizza",
  ...overrides,
});

describe("flattenReview", () => {
  it("flattens a review with pathway scores for the selected fit", () => {
    const review = makeReview();
    const result = flattenReview(review, "fit_a", yelpDataset);

    expect(result.text).toBe("Great pizza and wonderful service");
    expect(result.stars).toBe(4);
    expect(result.review_stars).toBe(5);
    expect(result.name).toBe("Joe's Pizza");
    expect(result.city).toBe("Phoenix");
    expect(result.state).toBe("AZ");
    expect(result.categories).toBe("Restaurant, Pizza");
    expect(result.target_label).toBe("positive");
    expect(result.pathway_0).toBe(0.8);
    expect(result.pathway_1).toBe(0.3);
    expect(result.pathway_2).toBe(0.5);
    expect(result.reconstruction_r2).toBe(0.91);
    expect(result.has_word_scores).toBe(false);
  });

  it("sets has_word_scores true when fit is in has_shap", () => {
    const review = makeReview({ has_shap: ["fit_a"] });
    const result = flattenReview(review, "fit_a", yelpDataset);
    expect(result.has_word_scores).toBe(true);

    const resultB = flattenReview(review, "fit_b", yelpDataset);
    expect(resultB.has_word_scores).toBe(false);
  });

  it("uses pathway scores from the specified fit", () => {
    const review = makeReview();
    const result = flattenReview(review, "fit_b", yelpDataset);

    expect(result.pathway_0).toBe(0.1);
    expect(result.pathway_1).toBe(0.9);
    expect(result.pathway_2).toBeUndefined();
    expect(result.reconstruction_r2).toBe(0.85);
  });

  it("derives classification_label from classification field", () => {
    const review = makeReview({ classification: 1, classification_probability: 0.987 });
    const result = flattenReview(review, "fit_a", yelpDataset);
    expect(result.classification_label).toBe("positive");
    expect(result.classification_probability).toBe(0.987);
  });

  it("derives negative classification_label when classification is 0", () => {
    const review = makeReview({ classification: 0, classification_probability: 0.123 });
    const result = flattenReview(review, "fit_a", yelpDataset);
    expect(result.classification_label).toBe("negative");
    expect(result.classification_probability).toBe(0.123);
  });

  it("omits classification fields when classification is absent", () => {
    const review = makeReview();
    const result = flattenReview(review, "fit_a", yelpDataset);
    expect(result.classification_label).toBeUndefined();
    expect(result.classification_probability).toBeUndefined();
  });

  it("handles reviews with missing optional fields", () => {
    const review = makeReview({
      name: undefined,
      city: undefined,
      state: undefined,
      stars: undefined,
      review_stars: undefined,
      categories: undefined,
    });
    const result = flattenReview(review, "fit_a", yelpDataset);

    expect(result.text).toBe("Great pizza and wonderful service");
    expect(result.name).toBeUndefined();
    expect(result.city).toBeUndefined();
    expect(result.pathway_0).toBe(0.8);
  });
});

describe("flattenReview attributes", () => {
  it("writes attribute values as searchable fields", () => {
    const review = makeReview({ classification: 0, classification_probability: 0.4 });
    const flat = flattenReview(review, "fit_a", yelpDataset);
    expect(flat.target).toBe(1);
    expect(flat.model_correct).toBe(0);
    expect(flat.is_synthetic).toBe(0);
  });

  it("sets model_correct to 1 when the prediction matches the target", () => {
    const review = makeReview({ classification: 1, classification_probability: 0.9 });
    const flat = flattenReview(review, "fit_a", yelpDataset);
    expect(flat.model_correct).toBe(1);
  });

  it("leaves aliased fields equal to the underlying review values", () => {
    const flat = flattenReview(makeReview(), "fit_a", yelpDataset);
    expect(flat.review_stars).toBe(5);
    expect(flat.stars).toBe(4);
  });

  it("omits attributes whose value is null rather than writing null", () => {
    // No classification, so model_correct is undefined for this review.
    const flat = flattenReview(makeReview(), "fit_a", yelpDataset);
    expect("model_correct" in flat).toBe(false);
  });

  it("still populates the existing non-attribute fields", () => {
    const flat = flattenReview(makeReview(), "fit_a", yelpDataset);
    expect(flat.text).toBe("Great pizza and wonderful service");
    expect(flat.pathway_0).toBe(0.8);
    expect(flat.has_word_scores).toBe(false);
  });
});
