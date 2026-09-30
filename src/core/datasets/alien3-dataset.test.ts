import { S3Index, S3Item } from "../types/s3-data";
import { alien3Dataset } from "./alien3-dataset";

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
  id: "361e65b1002a",
  target: 1,
  classification: 0,
  attributes: { voices_raised: 1, resource_stressed: 0 },
} as unknown as S3Item;

describe("alien3Dataset", () => {
  it("reads the three-pathway data from a path relative to the build root", () => {
    expect(alien3Dataset.id).toBe("alien3");
    expect(alien3Dataset.label).toBe("Alien Conversations (3 pathways)");
    expect(alien3Dataset.baseUrl).toBe("alien-data-3/");
    expect(alien3Dataset.baseUrl.startsWith("/")).toBe(false);
  });

  it("calls its items conversations", () => {
    expect(alien3Dataset.itemNoun).toEqual({ singular: "conversation", plural: "conversations" });
  });

  it("names the model's two answers", () => {
    expect(alien3Dataset.classificationLabels).toEqual({ 0: "wait", 1: "approach" });
  });

  it("puts the derived outcomes before the generated attributes", () => {
    expect(alien3Dataset.resolveAttributes(index).map(a => a.key))
      .toEqual(["target", "prediction", "model_correct", "voices_raised"]);
  });

  it("survives an index with no attributes", () => {
    const bare = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
    expect(alien3Dataset.resolveAttributes(bare).map(a => a.key))
      .toEqual(["target", "prediction", "model_correct"]);
  });

  it("rejects a generated attribute that collides with a derived one", () => {
    const clashing = {
      metadata: { fa_fits: {}, review_sets: {}, attributes: [{ ...generatedDefinition, key: "target" }] },
      items: [],
    } as unknown as S3Index;
    expect(() => alien3Dataset.resolveAttributes(clashing)).toThrow(/duplicate/i);
  });

  it("derives target and model_correct", () => {
    expect(alien3Dataset.getAttributeValue(item, "target")).toBe(1);
    expect(alien3Dataset.getAttributeValue(item, "model_correct")).toBe(0);
  });

  it("returns null for model_correct when either side is missing", () => {
    const noPrediction = { ...item, classification: undefined } as unknown as S3Item;
    expect(alien3Dataset.getAttributeValue(noPrediction, "model_correct")).toBeNull();
    const noTarget = { ...item, target: null } as unknown as S3Item;
    expect(alien3Dataset.getAttributeValue(noTarget, "model_correct")).toBeNull();
  });

  it("derives prediction instead of reading it from the generated bag", () => {
    // Without an explicit "prediction" case the default arm would read
    // item.attributes.prediction and return null for every conversation. The
    // fixture has classification 0 and no "prediction" in its bag, so only a
    // real derivation returns 0.
    expect(item.attributes).not.toHaveProperty("prediction");
    expect(alien3Dataset.getAttributeValue(item, "prediction")).toBe(0);
  });

  it("returns null for prediction when the conversation was never scored", () => {
    const noPrediction = { ...item, classification: undefined } as unknown as S3Item;
    expect(alien3Dataset.getAttributeValue(noPrediction, "prediction")).toBeNull();
  });

  it("reads generated attributes off the item, hidden ones included", () => {
    expect(alien3Dataset.getAttributeValue(item, "voices_raised")).toBe(1);
    expect(alien3Dataset.getAttributeValue(item, "resource_stressed")).toBe(0);
  });

  it("returns null for an attribute the item does not carry", () => {
    expect(alien3Dataset.getAttributeValue(item, "nope")).toBeNull();
  });

  it("keeps prediction out of regression predictors", () => {
    // See excludeFromRegression in src/core/types/attributes.ts.
    const attrs = alien3Dataset.resolveAttributes(index);
    expect(attrs.find(a => a.key === "prediction")?.excludeFromRegression).toBe(true);
    expect(attrs.find(a => a.key === "target")?.excludeFromRegression).toBeUndefined();
    expect(attrs.find(a => a.key === "model_correct")?.excludeFromRegression).toBeUndefined();
  });

  it("labels target and prediction from the same object as the classification labels", () => {
    // toBe, not toEqual: identity is what stops an axis drifting from the badge.
    const attrs = alien3Dataset.resolveAttributes(index);
    expect(attrs.find(a => a.key === "prediction")?.valueLabels).toBe(alien3Dataset.classificationLabels);
    expect(attrs.find(a => a.key === "target")?.valueLabels).toBe(alien3Dataset.classificationLabels);
  });
});
