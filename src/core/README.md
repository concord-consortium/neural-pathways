# core

Reviewed code shared by the student app (`src/app/`), the lesson views (`src/views/`) and the
dataset generator (`generator/`): data types, data loading, dataset definitions and math.

## Rules

- Every line under `src/app/`, `src/views/`, `src/core/` and `generator/` is reviewed. Code
  enters these folders only through a story's PR. The generator is reviewed because it writes
  the data students see.
- `core` imports only from `core` and packages.
- `generator` imports only from `generator`, `core` and packages.
- Nothing student-facing imports from `src/lab/` or `scripts/`, which are unreviewed, or from
  anything else outside `app`, `views` and `core`. ESLint (`import/no-restricted-paths`) enforces
  this and the generator rule; see `eslint.config.mjs`. Disabling the rule in any reviewed folder
  is itself a lint error, and `npm run lint:boundary` checks that the rule still catches
  violations.
- ESLint does not see SCSS `@use` or `@import`, so a reviewer checks that stylesheets here do
  not pull in styles from `src/lab/`.

## Promoting code from `src/lab/`

Promotion is a copy-and-review, rewriting where warranted, not a blind move. When the promotion
is essentially a move, switch `lab` to import the `core` version and delete the `lab` copy. When
it is a real rewrite, the `lab` original may stay until nothing in `lab` needs it.

## What's here

- `types/`: the data format. `s3-data.ts` (the index, activation and SHAP buckets) and
  `attributes.ts`.
- `data-loader.ts`: `fetchIndex`, `fetchActivations`, `fetchShap`.
- `data-url.ts`: `dataUrl`. Every fetched data URL goes through it; see the comment there.
- `math/`: `statistics.ts` (`mean`, `standardDeviation`, `isUsable`, `pearson`),
  `regression.ts` (`multipleRegression`, `logisticRegression`) and `matrix.ts` (the
  symmetric-matrix solvers regression uses).
- `datasets/dataset-definition.ts`: what a dataset is, and attribute-key validation.
- `datasets/alien3-dataset.ts`: the lesson's dataset, `alien3Dataset`.
- `state/`: the mobx-keystone models for the shared state and each view's state, and the context
  views use to reach them. What each view keeps, and the rules for changing a saved form, are in
  `docs/view-state.md`.

Comments here sometimes mention the Yelp and 4-pathway alien datasets, and the lab tools and
files that use this code (the explorer's search, Codings dialog, regression panel and item panel,
and the heatmap). The code was written for the lab tools first, and the data format around Yelp.
See [doc/datasets.md](../../doc/datasets.md) for what each dataset is.
