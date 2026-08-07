import { S3Review } from "../../shared/types/s3-data";
import { DatasetConfig } from "../../shared/datasets/dataset-config";
import { Series } from "../types/explorer-data";

/**
 * Builds one Series per attribute and per pathway, all aligned to the given
 * review order. Attributes come first, in dataset-config order, then pathways
 * P0..Pn-1 — the matrix draws its attribute/pathway separator at that boundary,
 * so the ordering is part of the contract.
 */
export function buildSeries(
  reviews: S3Review[],
  dataset: DatasetConfig,
  fitName: string,
  nPathways: number,
): Series[] {
  const series: Series[] = [];

  for (const definition of dataset.attributes) {
    series.push({
      key: definition.key,
      label: definition.label,
      kind: "attribute",
      attributeType: definition.type,
      valueLabels: definition.valueLabels,
      description: definition.description,
      values: reviews.map(review => dataset.getAttributeValue(review, definition.key)),
    });
  }

  for (let p = 0; p < nPathways; p++) {
    series.push({
      key: `pathway_${p}`,
      label: `P${p}`,
      kind: "pathway",
      description: "",
      values: reviews.map(review => {
        const scores = review.pathway_scores[fitName];
        return scores?.[p] ?? null;
      }),
    });
  }

  return series;
}
