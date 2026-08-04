import { DATASETS, DEFAULT_DATASET_ID, datasetFromId } from "./registry";

describe("datasetFromId", () => {
  it("returns the named dataset", () => {
    expect(datasetFromId("alien").id).toBe("alien");
  });

  it("falls back to the default for undefined", () => {
    expect(datasetFromId(undefined).id).toBe(DEFAULT_DATASET_ID);
  });

  it("falls back to the default for an unknown id rather than throwing", () => {
    // A mistyped link should show something, not a dead page.
    expect(datasetFromId("yelpp").id).toBe(DEFAULT_DATASET_ID);
  });

  it("lists both datasets", () => {
    expect(Object.keys(DATASETS).sort()).toEqual(["alien", "yelp"]);
  });
});
