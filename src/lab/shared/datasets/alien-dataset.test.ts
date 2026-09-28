import { S3Index, S3Item } from "../../../core/types/s3-data";
import { alien3Dataset, alienDataset } from "./alien-dataset";
import { alien3Dataset as alien3Definition } from "../../../core/datasets/alien3-dataset";

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
});

describe("alien3Dataset", () => {
  it("reads the three-pathway data from its own directory", () => {
    expect(alien3Dataset.id).toBe("alien3");
    expect(alien3Dataset.baseUrl).toBe("alien-data-3/");
    expect(alien3Dataset.baseUrl.startsWith("/")).toBe(false);
  });

  it("names its pathway count, as the four-pathway dataset now does", () => {
    // Both labels say how many pathways they have. One labelled and one not
    // would leave a reader guessing which dataset they had selected.
    expect(alienDataset.label).toBe("Alien Conversations (4 pathways)");
    expect(alien3Dataset.label).toBe("Alien Conversations (3 pathways)");
  });

  it("differs from the four-pathway dataset only in id, label and base URL", () => {
    // The pathway count lives in the generated metadata, not here, so the two
    // configs share every behaviour. Anything that drifts between them is a bug.
    expect(alien3Dataset.resolveAttributes(index).map(a => a.key))
      .toEqual(alienDataset.resolveAttributes(index).map(a => a.key));
    expect(alien3Dataset.getAttributeValue(item, "prediction")).toBe(0);
    expect(alien3Dataset.getAttributeValue(item, "model_correct")).toBe(0);
    expect(alien3Dataset.classificationLabels).toBe(alienDataset.classificationLabels);
    expect(alien3Dataset.itemNoun).toEqual(alienDataset.itemNoun);
    expect(alien3Dataset.searchFields).toEqual(alienDataset.searchFields);
  });

  it("advertises reconstruction_r2 as a search field, as yelp does", () => {
    // The search engine matches any key present in the data, but the help
    // dialog only lists what the config declares. Since NPW-18 every alien
    // conversation carries an R², so the field belongs in the dialog.
    for (const dataset of [alienDataset, alien3Dataset]) {
      expect(dataset.searchFields.map(f => f.name)).toEqual(["reconstruction_r2"]);
    }
  });

  it("is core's alien3 definition plus the search help", () => {
    // The lab config spreads the core definition, so its methods must survive
    // the spread and give the same answers.
    expect(alien3Dataset.baseUrl).toBe(alien3Definition.baseUrl);
    expect(alien3Dataset.resolveAttributes(index)).toEqual(alien3Definition.resolveAttributes(index));
    expect(alien3Dataset.getAttributeValue(item, "model_correct"))
      .toBe(alien3Definition.getAttributeValue(item, "model_correct"));
    expect(alien3Dataset.searchPlaceholder).toBe("voices_raised:1 AND pathway_0:>1");
  });
});
