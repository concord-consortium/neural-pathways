import { S3Index, S3Item } from "../../types/s3-data";

function conversation(
  id: string,
  text: string,
  target: number,
  classification: number | undefined,
  attributes: Record<string, number>,
  scores: number[],
  observation?: string,
): S3Item {
  return {
    id, text, target, classification, attributes, observation,
    target_label: target === 1 ? "approach" : "wait",
    sources: { alien3: [0] },
    pathway_scores: { "alien-fa-3": scores },
    pathway_variance_fractions: {},
  };
}

/**
 * Four conversations for the filter's tests. The third has no classification, so it has no
 * prediction or model_correct. The model is wrong on the second and fourth. The fourth has no
 * observation.
 */
export function filterTestIndex(): S3Index {
  return {
    metadata: {
      fa_fits: {
        "alien-fa-3": {
          source_split: "train",
          n_pathways: 3,
          explained_variance_per_pathway: [0.3, 0.2, 0.1],
          pathway_importance: [1, 1, 1],
          pathway_score_min: [-5, -5, -5],
          pathway_score_max: [5, 5, 5],
        },
      },
      review_sets: {},
      attributes: [
        { key: "voices_raised", label: "Voices raised", description: "", type: "binary" },
        { key: "group_size", label: "Group size", description: "", type: "integer", min: 1, max: 6 },
        { key: "resource_stressed", label: "Resource stressed", description: "", type: "binary", hidden: true },
      ],
    },
    items: [
      conversation("aaa111", "yandor quissa\nblikka murrash", 0, 0,
        { voices_raised: 0, group_size: 2, resource_stressed: 1 }, [-0.7, 0.4, 2.5],
        "Stores nearby were full. Two individuals, facing each other."),
      conversation("bbb222", "sooma nimbar\nyandor", 1, 0,
        { voices_raised: 1, group_size: 5, resource_stressed: 0 }, [2.4, -1, 0],
        "They were standing at the edge of open water."),
      conversation("ccc333", "chullo ormesh", 1, undefined,
        { voices_raised: 1, group_size: 1, resource_stressed: 0 }, [0.1, 3, -2],
        "Nothing to eat anywhere in frame."),
      conversation("ddd444", "blikka yandor", 0, 1,
        { voices_raised: 0, group_size: 3, resource_stressed: 1 }, [-3, 0.5, 1]),
    ],
  };
}
