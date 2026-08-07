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
      .toEqual(["target", "model_correct", "voices_raised"]);
  });

  it("survives an index with no attributes", () => {
    const bare = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;
    expect(alienDataset.resolveAttributes(bare).map(a => a.key))
      .toEqual(["target", "model_correct"]);
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
});
