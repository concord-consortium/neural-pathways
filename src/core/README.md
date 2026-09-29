# core

Reviewed code shared by the student app (`src/app/`) and the lesson views (`src/views/`):
data loading, types, math, generic charts.

## Rules

- Every line under `src/app/`, `src/views/` and `src/core/` is reviewed. Code enters these
  folders only through a story's PR.
- `core` imports only from `core` and packages. It never imports `app`, `views` or `lab`.
- Nothing student-facing imports from `src/lab/` or `scripts/`, which are unreviewed, or from
  anything else outside `app`, `views` and `core`. ESLint (`import/no-restricted-paths`) enforces
  this; see `eslint.config.mjs`. Disabling the rule in these folders is itself a lint error, and
  `npm run lint:boundary` checks that the rule still catches violations.
- ESLint does not see SCSS `@use` or `@import`, so a reviewer checks that stylesheets here do
  not pull in styles from `src/lab/`.

## Promoting code from `src/lab/`

Promotion is a copy-and-review, rewriting where warranted, not a blind move. When the promotion
is essentially a move, switch `lab` to import the `core` version and delete the `lab` copy. When
it is a real rewrite, the `lab` original may stay until nothing in `lab` needs it.

## State

`state/` holds the mobx-keystone models for the shared state and each view's state, and the
context views use to reach them. What each view keeps, and the rules for changing a saved shape,
are in `docs/view-state.md`.
