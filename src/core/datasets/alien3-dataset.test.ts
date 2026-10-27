import { S3Index, S3Item } from "../types/s3-data";
import { alien3Dataset, alien3Loadings, alien3Network } from "./alien3-dataset";
import { fixtureMetadata, fixtureNetwork } from "../network/__fixtures__/alien3-network";

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

describe("alien3Network", () => {
  it("reads the network from the index", () => {
    expect(alien3Network({ metadata: fixtureMetadata, items: [] })).toBe(fixtureNetwork);
  });

  it("says to generate the data when the index has none", () => {
    const { network: _network, ...metadata } = fixtureMetadata;
    expect(() => alien3Network({ metadata, items: [] }))
      .toThrow("The alien3 data has no network. Run npm run generate:alien to generate it.");
  });
});

describe("alien3Loadings", () => {
  it("reads the fit's loadings as [neuron][pathway]", () => {
    const fit = Object.values(fixtureMetadata.fa_fits)[0];
    const loadings = alien3Loadings({ metadata: fixtureMetadata, items: [] });
    expect(loadings).toHaveLength(14);
    expect(loadings[0]).toHaveLength(3);
    expect(loadings[5][2]).toBe(fit.loadings![2][5]);
  });

  it("says to generate the data when the fit has no loadings", () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings: undefined } } };
    expect(() => alien3Loadings({ metadata, items: [] }))
      .toThrow("The alien3 data has no loadings. Run npm run generate:alien to generate it.");
  });

  it("names the fits when the index has more than one", () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: fit, other: fit } };
    expect(() => alien3Loadings({ metadata, items: [] })).toThrow(
      `The alien3 data has more than one factor-analysis fit (${name}, other). `
      + "Run npm run generate:alien to generate it.");
  });

  it("says so when the index has no factor-analysis fit", () => {
    const metadata = { ...fixtureMetadata, fa_fits: {} };
    expect(() => alien3Loadings({ metadata, items: [] }))
      .toThrow("The alien3 data has no factor-analysis fit. Run npm run generate:alien to generate it.");
  });

  it("says so when the fit's loadings are empty", () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings: [] } } };
    expect(() => alien3Loadings({ metadata, items: [] }))
      .toThrow("The alien3 data has empty loadings. Run npm run generate:alien to generate it.");
  });

  it("says so when the fit's pathways have loadings for different numbers of neurons", () => {
    const [name, fit] = Object.entries(fixtureMetadata.fa_fits)[0];
    const loadings = fit.loadings!.map((row, pathway) => (pathway === 1 ? row.slice(1) : row));
    const metadata = { ...fixtureMetadata, fa_fits: { [name]: { ...fit, loadings } } };
    expect(() => alien3Loadings({ metadata, items: [] })).toThrow(
      "The alien3 data's pathways have loadings for different numbers of neurons (14, 13, 14). "
      + "Run npm run generate:alien to generate it.");
  });
});
