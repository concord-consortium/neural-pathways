import { S3Index, S3Item } from "../types/s3-data";
import { alienDataset } from "./alien-dataset";

const generatedDefinition = {
  key: "voices_raised",
  label: "Voices raised",
  description: "Whether any participant noticeably increased their volume.",
  type: "binary" as const,
  hidden: false,
  valueLabels: { 0: "no", 1: "yes" },
};

const index = {
  metadata: { fa_fits: {}, review_sets: {}, attributes: [generatedDefinition] },
  items: [],
} as unknown as S3Index;

const item = {
  id: "abc123456789",
  target: 1,
  classification: 0,
  attributes: { voices_raised: 1, resource_stressed: 0 },
} as unknown as S3Item;

describe("alienDataset", () => {
  it("loads its data from a path relative to the page", () => {
    expect(alienDataset.baseUrl).toBe("alien-data/");
    expect(alienDataset.baseUrl.startsWith("/")).toBe(false);
  });

  it("puts the derived outcomes before the generated attributes", () => {
    expect(alienDataset.resolveAttributes(index).map(a => a.key))
      .toEqual(["target", "prediction", "model_correct", "voices_raised"]);
  });

  it("survives an index with no attributes", () => {
    const bare = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
    expect(alienDataset.resolveAttributes(bare).map(a => a.key))
      .toEqual(["target", "prediction", "model_correct"]);
  });

  it("rejects a generated attribute that collides with a derived one", () => {
    const clashing = {
      metadata: { fa_fits: {}, review_sets: {}, attributes: [{ ...generatedDefinition, key: "target" }] },
      items: [],
    } as unknown as S3Index;
    expect(() => alienDataset.resolveAttributes(clashing)).toThrow(/duplicate/i);
  });

  it("derives target and model_correct", () => {
    expect(alienDataset.getAttributeValue(item, "target")).toBe(1);
    expect(alienDataset.getAttributeValue(item, "model_correct")).toBe(0);
  });

  it("returns null for model_correct when either side is missing", () => {
    const noPrediction = { ...item, classification: undefined } as unknown as S3Item;
    expect(alienDataset.getAttributeValue(noPrediction, "model_correct")).toBeNull();
  });

  it("reads generated attributes off the item, hidden ones included", () => {
    expect(alienDataset.getAttributeValue(item, "voices_raised")).toBe(1);
    expect(alienDataset.getAttributeValue(item, "resource_stressed")).toBe(0);
  });

  it("returns null for an attribute the item does not carry", () => {
    expect(alienDataset.getAttributeValue(item, "nope")).toBeNull();
  });

  it("names the model's two answers", () => {
    expect(alienDataset.classificationLabels).toEqual({ 0: "wait", 1: "approach" });
  });

  it("derives prediction instead of reading it from the generated bag", () => {
    // This is the test that earns its place. getAttributeValue's default arm
    // reads item.attributes[key], so without an explicit "prediction" case the
    // attribute would resolve to null for every conversation — no error, no
    // warning, just a silently empty column in the matrix and the fields view.
    // The fixture has classification 0 and no "prediction" key in its bag, so
    // only a real derivation can return 0 here.
    expect(item.attributes).not.toHaveProperty("prediction");
    expect(alienDataset.getAttributeValue(item, "prediction")).toBe(0);
  });

  it("returns null for prediction when the conversation was never scored", () => {
    const noPrediction = { ...item, classification: undefined } as unknown as S3Item;
    expect(alienDataset.getAttributeValue(noPrediction, "prediction")).toBeNull();
  });

  it("keeps prediction out of the regression panel's predictors", () => {
    // The regression panel filters on this flag, not on the key, so this is the
    // assertion that binds the two: renaming the key would no longer silently
    // restore a predictor that makes the design matrix singular. See
    // excludeFromRegression in shared/types/attributes.ts.
    const attrs = alienDataset.resolveAttributes(index);
    expect(attrs.find(a => a.key === "prediction")?.excludeFromRegression).toBe(true);
    expect(attrs.find(a => a.key === "target")?.excludeFromRegression).toBeUndefined();
    expect(attrs.find(a => a.key === "model_correct")?.excludeFromRegression).toBeUndefined();
  });

  it("labels target and prediction from the same object as the classification badge", () => {
    // toBe, not toEqual: identity is what stops the fields view's axis drifting
    // away from the item panel's badge.
    const attrs = alienDataset.resolveAttributes(index);
    expect(attrs.find(a => a.key === "prediction")?.valueLabels)
      .toBe(alienDataset.classificationLabels);
    expect(attrs.find(a => a.key === "target")?.valueLabels)
      .toBe(alienDataset.classificationLabels);
  });
});
