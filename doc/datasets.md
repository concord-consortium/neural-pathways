# Datasets

The code works with three datasets. They share one file format (see
[docs/data/s3-data-format.md](../docs/data/s3-data-format.md)), which is why code written for
one of them often mentions the others.

## How we got here

The research tools, the heatmap and the explorer, were built first, on real Yelp reviews
classified as positive or negative by a DistilBERT model. Factor analysis over the model's
neuron activations found pathways that explained most of the variance, but most of those pathways
could not be given a meaning ([docs/data/neural-pathways-review.md](../docs/data/neural-pathways-review.md)).
That is a fine research result but a poor lesson: a student who follows the method finds nothing.
So we built a generator that authors a dataset of alien-language conversations whose pathways are
planted on purpose, first with four pathways, then a three-pathway variant to see how few the
lesson can run on. The student lesson uses the three-pathway dataset.

## Catalog

| id | What it is | Where the data comes from | Items | Neurons | Pathways (fit) | Used by |
|---|---|---|---|---|---|---|
| `yelp` | Real Yelp restaurant reviews, labelled positive or negative, plus 432 GPT-written reviews | Built by the [NNMaker](https://github.com/concord-consortium/NNMaker) pipeline and published to S3 (`models-resources/neural-pathways/data/v1/`) | 6,427 reviews | 780 | 6 (`train-fa-6`), 7 (`test-fa-7`), 6 (`dev-fa-6`) | Lab tools (their default) |
| `alien` | Generated conversations in an invented language, each with an observer's English notes. The model's predictions, the attributes and the activations are generated too. | `npm run generate:alien`, written to `dist/alien-data/` | 800 conversations | 14 | 4 (`alien-fa-4`) | Lab tools |
| `alien3` | The same generator with three planted pathways | `npm run generate:alien`, written to `dist/alien-data-3/` | 800 conversations | 14 | 3 (`alien-fa-3`) | The student lesson, and the lab tools |

The two alien datasets are not committed. `npm start` and `npm run build` generate them, and a
deploy publishes them at each build's root (see
[src/core/data-url.ts](../src/core/data-url.ts)).

## Where each one is defined

- `yelp`: [src/lab/shared/datasets/yelp-dataset.ts](../src/lab/shared/datasets/yelp-dataset.ts)
- `alien`: [src/lab/shared/datasets/alien-dataset.ts](../src/lab/shared/datasets/alien-dataset.ts),
  built with the core alien factory
- `alien3`: [src/core/datasets/alien3-dataset.ts](../src/core/datasets/alien3-dataset.ts). The lab
  version adds the explorer's search help.
- Generator configs for both alien datasets: [scripts/alien-config.ts](../scripts/alien-config.ts)

## Further reading

- Yelp review sets and annotations: [docs/data/review-datasets.md](../docs/data/review-datasets.md)
- Why the alien dataset exists and what it plants:
  [docs/superpowers/specs/2026-07-30-attributes-and-alien-dataset-overview.md](../docs/superpowers/specs/2026-07-30-attributes-and-alien-dataset-overview.md)
- The three-pathway variant:
  [docs/superpowers/specs/2026-08-07-three-pathway-alien-dataset-design.md](../docs/superpowers/specs/2026-08-07-three-pathway-alien-dataset-design.md)
- How the alien activations are built: [docs/alien-activations.md](../docs/alien-activations.md)
