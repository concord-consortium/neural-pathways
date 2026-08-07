import { flattenItem } from "./flatten-item";
import { S3Item, S3Index } from "../../shared/types/s3-data";
import { yelpDataset } from "../../shared/datasets/yelp-dataset";
import { activateDataset } from "../../shared/datasets/dataset-config";

const emptyIndex = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
const activeYelp = activateDataset(yelpDataset, emptyIndex);

const makeItem = (overrides: Partial<S3Item> = {}): S3Item => ({
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

describe("flattenItem", () => {
  it("flattens an item with pathway scores for the selected fit", () => {
    const item = makeItem();
    const result = flattenItem(item, "fit_a", activeYelp);

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
    const item = makeItem({ has_shap: ["fit_a"] });
    const result = flattenItem(item, "fit_a", activeYelp);
    expect(result.has_word_scores).toBe(true);

    const resultB = flattenItem(item, "fit_b", activeYelp);
    expect(resultB.has_word_scores).toBe(false);
  });

  it("uses pathway scores from the specified fit", () => {
    const item = makeItem();
    const result = flattenItem(item, "fit_b", activeYelp);

    expect(result.pathway_0).toBe(0.1);
    expect(result.pathway_1).toBe(0.9);
    expect(result.pathway_2).toBeUndefined();
    expect(result.reconstruction_r2).toBe(0.85);
  });

  it("derives classification_label from classification field", () => {
    const item = makeItem({ classification: 1, classification_probability: 0.987 });
    const result = flattenItem(item, "fit_a", activeYelp);
    expect(result.classification_label).toBe("positive");
    expect(result.classification_probability).toBe(0.987);
  });

  it("derives negative classification_label when classification is 0", () => {
    const item = makeItem({ classification: 0, classification_probability: 0.123 });
    const result = flattenItem(item, "fit_a", activeYelp);
    expect(result.classification_label).toBe("negative");
    expect(result.classification_probability).toBe(0.123);
  });

  it("labels the classification from the dataset", () => {
    const item = makeItem({ classification: 0, classification_probability: 0.2 });
    expect(flattenItem(item, "fit_a", activeYelp).classification_label).toBe("negative");
  });

  it("omits classification fields when classification is absent", () => {
    const item = makeItem();
    const result = flattenItem(item, "fit_a", activeYelp);
    expect(result.classification_label).toBeUndefined();
    expect(result.classification_probability).toBeUndefined();
  });

  it("omits reconstruction_r2 when the item has none", () => {
    const item = makeItem();
    delete item.reconstruction_r2;
    expect("reconstruction_r2" in flattenItem(item, "fit_a", activeYelp)).toBe(false);
  });

  it("handles items with missing optional fields", () => {
    const item = makeItem({
      name: undefined,
      city: undefined,
      state: undefined,
      stars: undefined,
      review_stars: undefined,
      categories: undefined,
    });
    const result = flattenItem(item, "fit_a", activeYelp);

    expect(result.text).toBe("Great pizza and wonderful service");
    expect(result.name).toBeUndefined();
    expect(result.city).toBeUndefined();
    expect(result.pathway_0).toBe(0.8);
  });
});

describe("flattenItem attributes", () => {
  it("writes attribute values as searchable fields", () => {
    const item = makeItem({ classification: 0, classification_probability: 0.4 });
    const flat = flattenItem(item, "fit_a", activeYelp);
    expect(flat.target).toBe(1);
    expect(flat.model_correct).toBe(0);
    expect(flat.is_synthetic).toBe(0);
  });

  it("sets model_correct to 1 when the prediction matches the target", () => {
    const item = makeItem({ classification: 1, classification_probability: 0.9 });
    const flat = flattenItem(item, "fit_a", activeYelp);
    expect(flat.model_correct).toBe(1);
  });

  it("leaves aliased fields equal to the underlying item values", () => {
    const flat = flattenItem(makeItem(), "fit_a", activeYelp);
    expect(flat.review_stars).toBe(5);
    expect(flat.stars).toBe(4);
  });

  it("omits attributes whose value is null rather than writing null", () => {
    // No classification, so model_correct is undefined for this item.
    const flat = flattenItem(makeItem(), "fit_a", activeYelp);
    expect("model_correct" in flat).toBe(false);
  });

  it("still populates the existing non-attribute fields", () => {
    const flat = flattenItem(makeItem(), "fit_a", activeYelp);
    expect(flat.text).toBe("Great pizza and wonderful service");
    expect(flat.pathway_0).toBe(0.8);
    expect(flat.has_word_scores).toBe(false);
  });

  // A searchable observation would hand a student every deliberately-hidden
  // attribute in one search (`observation:"waited too long"` etc). This pins
  // the constraint so a future edit that helpfully spreads more of S3Item
  // into the flat object cannot silently reintroduce it.
  it("never adds the observation field to the flattened search object", () => {
    const item = makeItem({ observation: "This one hesitated for an unusually long time before approaching." });
    const flat = flattenItem(item, "fit_a", activeYelp);
    expect("observation" in flat).toBe(false);
    expect(JSON.stringify(flat)).not.toContain("hesitated");
  });
});
