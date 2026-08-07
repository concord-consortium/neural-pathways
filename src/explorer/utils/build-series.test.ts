import { S3Index, S3Item } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";
import {
  ActiveDataset, DatasetConfig, LoadedDataset,
  activateDataset, applyCommissions, NO_COMMISSIONS,
} from "../../shared/datasets/dataset-config";
import { buildSeries } from "./build-series";

const emptyIndex = { metadata: { fa_fits: {}, review_sets: {} }, items: [] } as unknown as S3Index;

const testConfig: DatasetConfig = {
  id: "test",
  label: "Test",
  baseUrl: "test-data/",
  itemNoun: { singular: "item", plural: "items" },
  classificationLabels: { 0: "negative", 1: "positive" },
  searchPlaceholder: "",
  searchFields: [],
  resolveAttributes: () => [
    {
      key: "flag", label: "Flag", description: "A flag.", type: "binary",
      valueLabels: { 0: "negative", 1: "positive" },
      excludeFromRegression: true,
    },
    { key: "rating", label: "Rating", description: "A rating.", type: "integer", min: 1, max: 5 },
  ],
  getAttributeValue: (item, key) => {
    if (key === "flag") return item.target;
    if (key === "rating") return item.review_stars ?? null;
    return null;
  },
};

const dataset: ActiveDataset = applyCommissions(activateDataset(testConfig, emptyIndex), NO_COMMISSIONS);

const makeItem = (overrides: Partial<S3Item> = {}): S3Item => ({
  id: "r1",
  sources: { test: [0] },
  text: "text",
  target: 1,
  target_label: "positive",
  pathway_scores: { fit_a: [0.8, -0.3] },
  reconstruction_r2: { fit_a: 0.9 },
  pathway_variance_fractions: { fit_a: [0.7, 0.3] },
  review_stars: 5,
  ...overrides,
});

describe("buildSeries", () => {
  const items = [
    makeItem({ id: "a", target: 1, review_stars: 5, pathway_scores: { fit_a: [0.8, -0.3] } }),
    makeItem({ id: "b", target: 0, review_stars: 2, pathway_scores: { fit_a: [-0.5, 0.1] } }),
  ];

  it("emits attributes first, then pathways", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series.map(s => s.key)).toEqual(["flag", "rating", "pathway_0", "pathway_1"]);
  });

  it("marks each series with its kind", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series.map(s => s.kind)).toEqual(["attribute", "attribute", "pathway", "pathway"]);
  });

  it("carries the attribute type only for attributes", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[0].attributeType).toBe("binary");
    expect(series[1].attributeType).toBe("integer");
    expect(series[2].attributeType).toBeUndefined();
  });

  it("carries the attribute's value labels onto the series", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[0].valueLabels).toEqual({ 0: "negative", 1: "positive" });
    // "rating" declares none, and pathways never have any.
    expect(series[1].valueLabels).toBeUndefined();
    expect(series[2].valueLabels).toBeUndefined();
  });

  it("carries the attribute's regression opt-out onto the series", () => {
    // The regression panel reads this off the Series, so a definition that sets
    // the flag has to survive the trip through buildSeries or the exclusion
    // silently stops applying in the running app.
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[0].excludeFromRegression).toBe(true);
    expect(series[1].excludeFromRegression).toBeUndefined();
    expect(series[2].excludeFromRegression).toBeUndefined();
  });

  it("uses the attribute label and a P-prefixed label for pathways", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[0].label).toBe("Flag");
    expect(series[2].label).toBe("P0");
    expect(series[3].label).toBe("P1");
  });

  it("collects attribute values aligned with the item order", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[0].values).toEqual([1, 0]);
    expect(series[1].values).toEqual([5, 2]);
  });

  it("collects pathway scores for the selected fit", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    expect(series[2].values).toEqual([0.8, -0.5]);
    expect(series[3].values).toEqual([-0.3, 0.1]);
  });

  it("records null for an item missing an attribute value", () => {
    const withMissing = [items[0], makeItem({ id: "c", review_stars: undefined })];
    const series = buildSeries(withMissing, dataset, "fit_a", 2);
    expect(series[1].values).toEqual([5, null]);
  });

  it("records null for an item with no scores for the selected fit", () => {
    const withMissing = [items[0], makeItem({ id: "d", pathway_scores: {} })];
    const series = buildSeries(withMissing, dataset, "fit_a", 2);
    expect(series[2].values).toEqual([0.8, null]);
  });

  it("gives every series the same length as the item list", () => {
    const series = buildSeries(items, dataset, "fit_a", 2);
    for (const s of series) {
      expect(s.values).toHaveLength(items.length);
    }
  });

  it("returns only attribute series when there are no pathways", () => {
    const series = buildSeries(items, dataset, "fit_a", 0);
    expect(series.map(s => s.key)).toEqual(["flag", "rating"]);
  });

  it("returns empty values arrays for an empty item list", () => {
    const series = buildSeries([], dataset, "fit_a", 2);
    expect(series).toHaveLength(4);
    expect(series[0].values).toEqual([]);
  });
});

// A hidden attribute that reaches a series is plottable in the correlation
// matrix and usable in a regression, which hands a student the answer they
// were supposed to decide whether to pay for.
describe("buildSeries visibility", () => {
  const hidden: AttributeDefinition = {
    key: "resource_stressed", label: "Resource stressed", description: "d",
    type: "binary", hidden: true,
  };

  function loadedWithHidden(): LoadedDataset {
    return {
      config: testConfig,
      allAttributes: [hidden],
      getAttributeValue: () => 1,
    };
  }

  it("omits an uncommissioned attribute from the series list", () => {
    const series = buildSeries([makeItem()], applyCommissions(loadedWithHidden(), NO_COMMISSIONS), "fit_a", 0);
    expect(series.map(s => s.key)).not.toContain("resource_stressed");
  });

  it("includes it once commissioned", () => {
    const series = buildSeries(
      [makeItem()], applyCommissions(loadedWithHidden(), new Set(["resource_stressed"])), "fit_a", 0,
    );
    expect(series.map(s => s.key)).toContain("resource_stressed");
  });
});
