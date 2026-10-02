# Moving the Alien Generator to `generator/` — Design

## Overview

The alien dataset generator writes the alien3 data that the student app loads, so students see
what it produces. It is production code in effect, and it gets the same bar as `src/app/`,
`src/views/` and `src/core/`: every line reviewed, and no dependence on unreviewed code. The
analysis scripts in `scripts/analysis/` are research, like `src/lab/`, and stay unreviewed.

This came out of the review of the repo reorganization (PR #26), which left `scripts/` as a
whole unreviewed. The review raised two points this work settles:

- `scripts/` should get a full review, in its own PR.
- The generator imports statistics and regression code from `src/lab/`. As `src/core/` takes over
  the data types and loader, the generator could drift from what core expects, with nothing to
  catch it.

Jira: [NPW-46](https://concord-consortium.atlassian.net/browse/NPW-46), a separate story under
the NPW-15 epic. NPW-29 was not used: it covers loading the alien3 data in core, and this work
builds on its PR, #28.

After this work:

- `generator/` holds the generator. It is reviewed, and it imports only itself, `src/core/` and
  packages.
- `scripts/` holds only the unreviewed analysis scripts.
- The generator and core share one reviewed copy of the math and the data types, and a test
  checks that core's loader reads what the generator writes.

## Starting point

This work starts from PR #28 (NPW-29), now merged. That PR moved into core the S3 data and
attribute types, `validateAttributeKeys` and the data loader, and repointed the generator at
them. The generator's remaining imports from `src/lab/` are:

| Import | From | Used by |
|---|---|---|
| `pearson` | `src/lab/explorer/utils/statistics.ts` | `alien/attributes.ts`, `alien/checks.ts`, `alien/outcomes.ts`, `alien/summary.ts`, and the tests `alien/attributes.test.ts` and `alien/conversations.test.ts` |
| `logisticRegression` | `src/lab/explorer/utils/regression.ts` | `alien/emit.ts` |

The generator is about 2.5k lines, plus 1.3k lines of tests:

- `scripts/generate-alien-data.ts`, the entry point run by `npm run generate:alien`
- `scripts/alien-config.ts` and `scripts/alien-config.test.ts`
- `scripts/alien/`

`scripts/analysis/activation-floor.ts` imports the generator (`alien-config`, `alien/checks`,
`alien/config-types`, `alien/pipeline`). Unreviewed code may import reviewed code, so that is
allowed.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where the generator lives | **Top-level `generator/`** | It is Node code (run with `ts-node` under `tsconfig.generator.json`, using `fs` and `path`), and `src/` is browser code with a DOM-based tsconfig. A top-level folder keeps the runtimes apart and leaves `scripts/` holding only research scripts. The name is not tied to "alien", so a future dataset generator fits. |
| What moves | The entry point, `alien-config.ts` and its test, and `alien/` | Everything the generator runs. |
| The 4-pathway alien config | **Moves with the rest** | It shares all its code with the alien3 config. It still writes a lab-only dataset (`dist/alien-data`); only its location changes. |
| The analysis scripts | **Stay in `scripts/analysis/`, unreviewed** | Research code. They may keep importing `src/lab/`. |
| How the generator stops depending on lab | **Promote `pearson` and `logisticRegression`, with what they depend on, into `src/core/math/`** | One reviewed copy of the math. Follows the promotion rules in `src/core/README.md`: when a promotion is essentially a move, `lab` switches to the core version and the lab copy is deleted. See [Promoting the math](#promoting-the-math). |
| How many PRs | **One PR merges: the promotion and the move together** | The promotion exists only so the generator can move; splitting it out adds a PR cycle without making either part easier to review. A separate review PR, never merged, still gives the reviewer every line (see [Getting a line-by-line review](#getting-a-line-by-line-review)). |

Rejected locations:

- `src/generator/`: keeps every reviewed area under `src/`, but the main tsconfig would
  type-check Node code with browser settings unless the folder is excluded. It also mixes two
  runtimes in `src/`.
- `data/generator/`: the same as `generator/`, with a parent folder we have no other use for yet.
- Keeping the generator in `scripts/` and moving the analysis scripts out: the smallest move, but
  `scripts/` does not sound reviewed, and the generator would not get a reviewable diff.
- `src/core/generator/`: core is browser code imported by app and views, and its rule is "core
  imports only core".

## Layout after the move

```
generator/
  generate-alien-data.ts
  alien-config.ts
  alien-config.test.ts
  alien3-round-trip.test.ts  see Round-trip test
  alien/                     unchanged internally
scripts/
  analysis/                  unreviewed research scripts
```

The output paths do not change. The entry point resolves each config's `outputDir` against the
folder above it, and `generator/` is at the same depth as `scripts/`, so the data still lands in
`dist/alien-data` and `dist/alien-data-3`.

## Promoting the math

Neither function can move alone. `pearson` uses `isUsable` and returns `CorrelationResult`.
`logisticRegression` uses `mean` and `standardDeviation`, `invertSymmetric` and
`solveSymmetric` from `matrix.ts`, and a private `standardizeColumns` it shares with
`multipleRegression`. The rest of `statistics.ts` (binning, `summarize`, `compareGroups`,
`linearFit`) is chart code only the lab uses.

| Lab file | What happens | Core file |
|---|---|---|
| `src/lab/explorer/utils/matrix.ts` and its test | Moves whole | `src/core/math/matrix.ts` |
| `src/lab/explorer/utils/regression.ts` and its test | Moves whole, `multipleRegression` included, so the shared helper is not split | `src/core/math/regression.ts` |
| `src/lab/explorer/utils/statistics.ts` and its test | Splits: `mean`, `standardDeviation`, `isUsable`, `pearson` and `CorrelationResult` move, with their tests. The chart code stays in lab and imports the basics from core. | `src/core/math/statistics.ts` |

This is essentially a move, so the lab copies are deleted and every lab import of the moved
code switches to `src/core/math/`. The lab statistics module does not re-export the moved
functions; callers import them from core directly. `design-matrix.ts` stays in lab.

About 400 lines of source become core code, and they get the same line-by-line review as the
generator.

## Import boundary

Add a zone to `eslint.config.mjs`, in the same allow-list style as the others:

| From | May import |
|---|---|
| `generator/` | `generator/`, `src/core/`, packages |

Two existing blocks need their `files` widened, or the new zone and its protection do nothing:

- The "student-facing import boundary" block applies `import/no-restricted-paths` only to
  `src/**`. A zone whose target is `./generator` never fires unless that block also covers
  `generator/**`.
- The "student-facing import boundary may not be disabled" block covers only
  `src/{app,views,core}`. Extend it to `generator/**`, since the generator is reviewed code too.

Rename both blocks and `boundaryMessage` so they say "reviewed code" rather than
"student-facing" where they now cover the generator.

App, views and core already may not import `generator/`, because the allow-list forbids anything
outside their own folders. Add cases to `eslint.config.test.mjs` (`npm run lint:boundary`) for:

- `generator/` importing `src/lab/` and `scripts/` (forbidden)
- `generator/` importing `src/core/` (allowed)
- `scripts/analysis/` importing `generator/` (allowed)
- `src/core/` importing `generator/` (forbidden)
- disabling `import/no-restricted-paths` in `generator/` (forbidden), like the existing case
  for student-facing code

## Round-trip test

A test (`generator/alien3-round-trip.test.ts`) that runs the generator on the shipped alien3
config, writes to a temporary folder, and reads the
result back with core's loader from NPW-29 (the index, activations and SHAP buckets). The
loader fetches by URL, so the test serves or mocks those fetches from the temporary folder;
the implementation plan settles how. This catches the generator and core disagreeing about the
dataset schema.

## Getting a line-by-line review

A pure `git mv` shows in GitHub as "renamed without changes", with no lines to comment on. The
same goes for `matrix.ts` and `regression.ts` moving into core. Two PRs get around that:

1. **Review PR (never merged).** Its base is `main` with the generator files and the lab
   `matrix.ts`, `regression.ts` and their tests deleted. Its head is the move PR's tree. GitHub
   shows the generator and all of `src/core/math/` as new, so the reviewer can comment on any
   line, and shows the lab changes (the `statistics.ts` split and the import updates) as
   ordinary edits. Close it once the review is done.
2. **Move PR (merged).** Against `main`, and the only PR that merges. The pure `git mv`s come
   first as their own commit (the generator to `generator/`, `matrix.ts` and `regression.ts` to
   `src/core/math/`), followed by the `statistics.ts` split, the path, import and config
   updates, and the fixes from the review PR.

## Other updates

- `tsconfig.generator.json`: include `generator/**/*` as well as `scripts/**/*`, since the analysis
  scripts still run under it.
- `package.json`: point `generate:alien` at `generator/generate-alien-data.ts`.
- `eslint.config.mjs`: add `generator/**/*.ts` and its tests to the Node-globals blocks that now
  cover `scripts/`. The rule that turns `no-console` off for the printed run summary applies to
  both. The boundary changes are in [Import boundary](#import-boundary).
- Docs:
  - `README.md`'s layout table gets a `generator/` row, and its review rule lists `generator/`.
  - `src/core/README.md` lists `generator/` among the reviewed folders, and its "What's here"
    list gets `math/`.
  - `docs/testing-alien-generator.md` and `doc/datasets.md` (the dataset catalog from NPW-29)
    get the new paths.
