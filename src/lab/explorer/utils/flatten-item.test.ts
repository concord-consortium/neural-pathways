import { flattenItem } from "./flatten-item";
import { S3Item, S3Index } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";
import { yelpDataset } from "../../shared/datasets/yelp-dataset";
import {
  activateDataset, applyCommissions, NO_COMMISSIONS, LoadedDataset,
} from "../../shared/datasets/dataset-config";

const emptyIndex = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
const activeYelp = applyCommissions(activateDataset(yelpDataset, emptyIndex), NO_COMMISSIONS);

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

// A hidden attribute that reaches the flat object is searchable, which hands a
// student the answer they were supposed to decide whether to pay for. Pinned
// here because a leak would be invisible: nothing renders this object.
describe("flattenItem visibility", () => {
  const hidden: AttributeDefinition = {
    key: "resource_stressed", label: "Resource stressed", description: "d",
    type: "binary", hidden: true,
  };

  function loadedWithHidden(): LoadedDataset {
    return {
      config: yelpDataset,
      allAttributes: [hidden],
      getAttributeValue: () => 1,
    };
  }

  it("omits an uncommissioned attribute from the search object", () => {
    const flat = flattenItem(makeItem(), "fit_a",
      applyCommissions(loadedWithHidden(), NO_COMMISSIONS));
    expect("resource_stressed" in flat).toBe(false);
  });

  it("includes it once commissioned", () => {
    const flat = flattenItem(makeItem(), "fit_a",
      applyCommissions(loadedWithHidden(), new Set(["resource_stressed"])));
    expect(flat.resource_stressed).toBe(1);
  });
});

describe("flattenItem pathway prediction", () => {
  const importanceA = [1, 2, -1]; // fit_a scores [0.8, 0.3, 0.5] sum to 0.9

  it("writes the weighted sum and the label it implies", () => {
    const flat = flattenItem(makeItem(), "fit_a", activeYelp, importanceA);
    expect(flat.pathway_prediction).toBeCloseTo(0.9, 10);
    expect(flat.pathway_prediction_label).toBe("positive");
  });

  it("labels a negative sum with the dataset's negative label", () => {
    const flat = flattenItem(makeItem(), "fit_a", activeYelp, [-1, -2, 1]);
    expect(flat.pathway_prediction).toBeCloseTo(-0.9, 10);
    expect(flat.pathway_prediction_label).toBe("negative");
  });

  it("uses the scores of the selected fit", () => {
    // fit_b has two scores [0.1, 0.9], so it needs a two-long importance.
    const flat = flattenItem(makeItem(), "fit_b", activeYelp, [2, 1]);
    expect(flat.pathway_prediction).toBeCloseTo(1.1, 10);
  });

  it("sets matches true when the implied class equals the classification", () => {
    const item = makeItem({ classification: 1, classification_probability: 0.9 });
    expect(flattenItem(item, "fit_a", activeYelp, importanceA).pathway_prediction_matches)
      .toBe(true);
  });

  it("sets matches false when the implied class differs", () => {
    const item = makeItem({ classification: 0, classification_probability: 0.4 });
    expect(flattenItem(item, "fit_a", activeYelp, importanceA).pathway_prediction_matches)
      .toBe(false);
  });

  // False would read as "the pathways disagree with the model" on an item the
  // model never scored — which is most yelp reviews, since only the test split
  // was scored.
  it("omits matches when the item has no classification", () => {
    const flat = flattenItem(makeItem(), "fit_a", activeYelp, importanceA);
    expect("pathway_prediction_matches" in flat).toBe(false);
    expect(flat.pathway_prediction).toBeCloseTo(0.9, 10);
  });

  it("omits all three fields when no importance is passed", () => {
    const flat = flattenItem(makeItem({ classification: 1 }), "fit_a", activeYelp);
    expect("pathway_prediction" in flat).toBe(false);
    expect("pathway_prediction_label" in flat).toBe(false);
    expect("pathway_prediction_matches" in flat).toBe(false);
  });

  it("omits all three fields when the importance length does not match", () => {
    const flat = flattenItem(makeItem({ classification: 1 }), "fit_a", activeYelp, [1, 2]);
    expect("pathway_prediction" in flat).toBe(false);
    expect("pathway_prediction_label" in flat).toBe(false);
    expect("pathway_prediction_matches" in flat).toBe(false);
  });
});
