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
