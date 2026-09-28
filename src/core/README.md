# core

Reviewed code shared by the student app (`src/app/`) and the lesson views (`src/views/`):
data loading, types, math, generic charts.

## Rules

- Every line under `src/app/`, `src/views/` and `src/core/` has been reviewed. Code enters these
  folders only through a story's PR.
- `core` imports only from `core`. It never imports `app`, `views` or `lab`.
- Nothing student-facing imports from `src/lab/`. ESLint (`import/no-restricted-paths`) enforces
  this; see `eslint.config.mjs`.

## Promoting code from `src/lab/`

Promotion is a copy-and-review, rewriting where warranted, not a blind move. When the promotion
is essentially a move, switch `lab` to import the `core` version and delete the `lab` copy. When
it is a real rewrite, the `lab` original may stay until nothing in `lab` needs it.

## What's here

- `types/`: the data format. `s3-data.ts` (the index, activation and SHAP buckets) and
  `attributes.ts`.
- `data-loader.ts`: `fetchIndex`, `fetchActivations`, `fetchShap`.
- `data-url.ts`: `dataUrl`. Every fetched data URL goes through it. A page-relative URL breaks on
  the released top-level `index.html`, whose build and data live in `version/<tag>/`. See
  [doc/deploy.md](../../doc/deploy.md).
- `datasets/dataset-definition.ts`: what a dataset is, and attribute-key validation.
- `datasets/alien3-dataset.ts`: the lesson's dataset, `alien3Dataset`.
