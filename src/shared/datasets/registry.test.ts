import { DATASETS, DATASET_LIST, DEFAULT_DATASET_ID, datasetFromId } from "./registry";

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

  it("keeps DATASET_LIST (the dropdown) in agreement with DATASETS (the #dataset= lookup)", () => {
    // A dataset present in only one of the two would either be unreachable
    // from the dropdown, or offered by the dropdown and then silently
    // rewritten to the default by datasetFromId. DATASET_LIST is derived
    // from DATASETS specifically to make that impossible; this pins it.
    expect(DATASET_LIST).toEqual(Object.values(DATASETS));
    expect(DATASET_LIST.map(d => d.id).sort()).toEqual(Object.keys(DATASETS).sort());
  });
});
