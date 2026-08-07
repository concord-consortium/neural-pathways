import { S3Review } from "../types/s3-data";
import { yelpDataset } from "./yelp-dataset";

const baseReview: S3Review = {
  id: "r719",
  sources: { test: [0] },
  text: "Delivery was FAST.",
  target: 1,
  target_label: "positive",
  stars: 4.0,
  review_stars: 5,
  pathway_scores: { "test-fa-7": [1.01, -0.52] },
  reconstruction_r2: { "test-fa-7": 0.97 },
  pathway_variance_fractions: { "test-fa-7": [0.98, 0.01] },
};

const get = (review: S3Review, key: string) => yelpDataset.getAttributeValue(review, key);

describe("yelpDataset", () => {
  it("declares the five derived attributes in order", () => {
    expect(yelpDataset.attributes.map(a => a.key))
      .toEqual(["review_stars", "stars", "target", "model_correct", "is_synthetic"]);
  });

  it("gives every attribute a non-empty label and description", () => {
    for (const attr of yelpDataset.attributes) {
      expect(attr.label.length).toBeGreaterThan(0);
      expect(attr.description.length).toBeGreaterThan(0);
    }
  });

  it("labels the target's values as the sentiment they mean, not yes/no", () => {
    const target = yelpDataset.attributes.find(a => a.key === "target");
    expect(target?.valueLabels).toEqual({ 0: "negative", 1: "positive" });
  });

  it("gives every binary attribute a label for both of its values", () => {
    for (const attr of yelpDataset.attributes) {
      if (attr.type !== "binary") continue;
      expect(attr.valueLabels?.[0]).toBeTruthy();
      expect(attr.valueLabels?.[1]).toBeTruthy();
    }
  });

  it("aliases review_stars and stars to the underlying review fields", () => {
    expect(get(baseReview, "review_stars")).toBe(baseReview.review_stars);
    expect(get(baseReview, "stars")).toBe(baseReview.stars);
  });

  it("returns the target as a number", () => {
    expect(get(baseReview, "target")).toBe(1);
  });

  it("reports model_correct as 1 when classification matches target", () => {
    expect(get({ ...baseReview, classification: 1 }, "model_correct")).toBe(1);
  });

  it("reports model_correct as 0 when classification differs from target", () => {
    expect(get({ ...baseReview, classification: 0 }, "model_correct")).toBe(0);
  });

  it("returns null for model_correct when there is no classification", () => {
    expect(get(baseReview, "model_correct")).toBeNull();
  });

  it("returns null for model_correct when there is no target", () => {
    expect(get({ ...baseReview, target: null, classification: 1 }, "model_correct")).toBeNull();
  });

  it("detects synthetic reviews from their sources", () => {
    const synthetic = { ...baseReview, sources: { "synthetic-gpt": [3] } };
    expect(get(synthetic, "is_synthetic")).toBe(1);
    expect(get(baseReview, "is_synthetic")).toBe(0);
  });

  it("returns null for missing optional star fields", () => {
    const bare = { ...baseReview, stars: undefined, review_stars: undefined };
    expect(get(bare, "stars")).toBeNull();
    expect(get(bare, "review_stars")).toBeNull();
  });

  it("returns null for an unknown key", () => {
    expect(get(baseReview, "not_an_attribute")).toBeNull();
  });
});
