# Alien3 Data in Core — Design

## Overview

Give the student app and its views a reviewed way to load the alien3 dataset from `src/core/`.

Jira: [NPW-29](https://concord-consortium.atlassian.net/browse/NPW-29). Blocked by NPW-22 (repo
reorganization); blocks NPW-32 (Trace a Case, first version) and NPW-35 (Filter).

Today the loader, the S3 data types and the dataset configs live in `src/lab/shared/`, which
student-facing code may not import. This story promotes the parts the views need into
`src/core/`, switches `lab` and `scripts/` to the core versions, and fixes data loading on the
released top-level page.

alien3 is the 3-pathway generated alien dataset: one fit, `alien-fa-3`, with 3 pathways over 14
neurons and 800 conversations, generated into `dist/alien-data-3/`
(`scripts/alien-config.ts`). The pathway count comes from the generated metadata, not from the
dataset config.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| How much of the dataset config goes to core | A small `DatasetDefinition` (id, label, baseUrl, item noun, classification labels, attributes). Lab's `DatasetConfig` extends it with the explorer's search fields. | Views need the derived attributes (`model_correct` etc.); they do not need explorer search help or commissioning. |
| Loader API | Unchanged: `fetchIndex(dataset)`, `fetchActivations(dataset, id, cache)`, `fetchShap(dataset, id, fitName, cache)`. | Keeps the promotion a move. A hook or shared cache waits for the first view that needs one (NPW-32 / NPW-35). |
| Where data URLs resolve from | Against webpack's runtime public path, not the page URL. | The released `index.html` is at the top level but its build lives in `version/<tag>/`. See below. |
| Real-data test in Jest | None. | It would depend on `generate:alien` having run. The generator's own self-checks cover the data. |

## The top-level page problem

A release copies `index-top.html` to `neural-pathways/index.html` (`release.yml`); `main` is also
published at the top level as `neural-pathways/index-main.html` (`topBranches` in `ci.yml`).
Those pages load their scripts from `version/<tag>/assets/` (or `branch/main/assets/`), but a
fetch of the relative URL `alien-data-3/index.json` resolves against the page, giving
`neural-pathways/alien-data-3/index.json`, which is never uploaded. Branch and version pages work
only because the page and the data happen to share a folder.

The data itself is already published correctly: the S3 deploy action runs `npm run build`
(which runs `generate:alien` before webpack) and uploads `dist/`, so `alien-data-3/` sits next to
`index.html` in every branch and version folder. Only the URL the code computes is wrong.

The fix is the approach [doc/deploy.md](../../../doc/deploy.md) already recommends when a path
cannot be an `import`: resolve against `__webpack_public_path__`. `output.publicPath` is unset,
so webpack 5 uses `auto`, which derives the build root from the executing script's URL (backing
out of the `assets/` subfolder). On the top-level page that is `…/version/<tag>/`; on every other
page it is the page's own folder, so nothing else changes.

## What moves where

### New in `src/core/`

| File | Contents |
|---|---|
| `types/s3-data.ts` | Moved whole from `src/lab/shared/types/`. It describes the wire format the loader parses, so the optional yelp fields on `S3Item` stay. |
| `types/attributes.ts` | Moved whole. Comment references to explorer files are corrected to their `src/lab/…` paths; the prose is unchanged. |
| `data-url.ts` | `dataUrl(baseUrl, path)`: see below. Declares `__webpack_public_path__` itself, as the snippet in doc/deploy.md does, rather than in a `global.d.ts`: ts-node (used by `scripts/`) does not load `include`d declaration files, and `scripts/analysis/pathway-prediction-residual.ts` imports the loader. |
| `data-loader.ts` | `fetchIndex`, `fetchActivations`, `fetchShap`, taking a `DatasetDefinition`. Each builds its URL with `dataUrl`. The wire interfaces (`S3IndexWire` etc.) stay private to this module. |
| `datasets/dataset-definition.ts` | `DatasetDefinition` interface; `RESERVED_FIELD_NAMES`; `validateAttributeKeys`. |
| `datasets/alien3-dataset.ts` | `CLASSIFICATION_LABELS`, the derived `target` / `prediction` / `model_correct` attributes, the exported `createAlienDataset` factory (core fields only), and `alien3Dataset`. |

```ts
export interface DatasetDefinition {
  id: string;
  label: string;
  /** Relative to the build root (no leading slash), or an absolute URL. */
  baseUrl: string;
  itemNoun: { singular: string; plural: string };
  classificationLabels: Record<number, string>;
  resolveAttributes(index: S3Index): AttributeDefinition[];
  /** Returns null when the attribute does not apply to this item. */
  getAttributeValue: (item: S3Item, key: string) => number | null;
}
```

`validateAttributeKeys` and `RESERVED_FIELD_NAMES` look explorer-specific but go to core: the
alien factory's `resolveAttributes` calls them, NPW-35 brings search to the student app, and
`scripts/alien/config-validation.ts` uses them.

### `dataUrl`

```ts
declare const __webpack_public_path__: string;

export function dataUrl(baseUrl: string, path: string): string {
  const relative = baseUrl + path;
  return typeof __webpack_public_path__ === "string"
    ? new URL(relative, __webpack_public_path__).href
    : relative;
}
```

- Webpack rewrites `typeof __webpack_public_path__` at build time, so the bundle always takes
  the first branch.
- Under Jest and ts-node the identifier is undeclared; `typeof` of an undeclared identifier is
  `"undefined"` (no `ReferenceError`), so they take the page-relative branch, which is today's
  behavior.
- An absolute `baseUrl` (yelp's S3 URL) is unaffected: `new URL(absolute, base)` ignores `base`.
- `baseUrl` values stay relative strings in the dataset definitions, so the existing
  "relative, no leading slash" test still holds; resolution happens only at fetch time.

### Stays in `src/lab/`, rewired to core

- `shared/datasets/dataset-config.ts`: `DatasetConfig extends DatasetDefinition`, adding
  `searchPlaceholder` and `searchFields`. `LoadedDataset`, `ActiveDataset`, `NO_COMMISSIONS`,
  `activateDataset`, `applyCommissions`, `codeableAttributes` and `capitalize` stay. Lab's type
  name and its call sites are unchanged.
- `shared/datasets/alien-dataset.ts`: builds `alienDataset` (4-pathway) with core's
  `createAlienDataset`, and a lab `alien3Dataset` from core's, each plus the alien search fields
  (`searchPlaceholder`, `searchFields`). `registry.ts` is unchanged.
- `shared/datasets/yelp-dataset.ts`: imports `validateAttributeKeys` and the types from core.
- `fitToPathways`, `fitToScaler`, `fitToMetadata`, `standardizeActivations` and
  `requireActivationModel`: only the heatmap uses them, so they move to
  `src/lab/heatmap/utils/fit-to-viz.ts`, next to the `viz-data` types they return.
  `src/lab/shared/data-loader.ts` and `src/lab/shared/types/` are deleted.
- Every other lab importer (explorer, heatmap, `dataset-selector.tsx`) switches its type and
  loader imports to core.

### `scripts/`

`scripts/alien/emit.ts`, `scripts/alien/config-validation.ts`, `scripts/analysis/disagreement.ts`
(and its test) and `scripts/analysis/pathway-prediction-residual.ts` switch their imports of the
types, `validateAttributeKeys` and `fetchIndex` to `src/core/`. Their imports of explorer utils
(`regression`, `statistics`, `pathway-prediction`) stay on `src/lab/`.

## Build

`build:top-test` builds into `top-test/specific/release/`, but `generate:alien` writes to
`dist/`, so the local release rehearsal has no data. The script gains a copy of
`dist/alien-data-3` (and `dist/alien-data`, so the lab explorer's alien option works there too)
into `top-test/specific/release/`, matching what S3 holds after a release.

## Testing

**Jest**

- `src/core/data-url.test.ts`: with no public path (page-relative); with a stubbed
  `globalThis.__webpack_public_path__` of `https://host/neural-pathways/version/v1/`, a relative
  base resolves under it; an absolute base is returned unchanged.
- `src/core/data-loader.test.ts`: moved from lab and pointed at alien3-shaped fixtures instead of
  yelp. Index renaming (`reviews` → `items`), activations bucket fetch and caching, SHAP bucket
  fetch and caching per fit, missing-item and non-OK errors, and the fetched URLs.
- `src/core/datasets/alien3-dataset.test.ts`: the derived-attribute and attribute-merging tests
  from lab's `alien-dataset.test.ts`, run against core's `alien3Dataset`.
- `src/lab/shared/datasets/alien-dataset.test.ts`: keeps the 4-pathway `baseUrl` check and adds
  one that both lab alien configs carry the alien search fields.
- The `fitTo*` / `standardizeActivations` tests move with their code to
  `src/lab/heatmap/utils/fit-to-viz.test.ts`.
- `dataset-config.test.ts` and `validateAttributeKeys` tests split along the same line as the
  code.
- All other lab and scripts tests pass with only import-path changes.

**Playwright (CI)**: the existing explorer tests (`explorer.html`, `#dataset=alien`, the
correlations view) now run through the core loader and `dataUrl`.

**Manual, once, before the PR**

1. `npm run build:top-test` then `npm run serve:top-test`.
2. Open `specific/release/explorer.html#dataset=alien3`; confirm it loads, then select a
   conversation so the activations and SHAP buckets are fetched. Repeat with the default yelp
   dataset.
3. Temporarily call `fetchIndex(alien3Dataset)` from `src/app/index.tsx`, rebuild, open the
   top-level `index-top.html`, and confirm in the network panel that the request goes to
   `specific/release/alien-data-3/index.json` and succeeds. Remove the temporary call.

NPW-32's Playwright tests should cover the top-level page for real once a view fetches data.

**Lint**: the `import/no-restricted-paths` boundary shows `core` imports nothing from `lab`.

## Docs

- `src/core/README.md` gains a short "What's here" list: types, loader, `dataUrl` and why data
  URLs must go through it, the alien3 definition.
- `doc/deploy.md` gains a sentence that `src/core/data-url.ts` is this project's use of the
  `__webpack_public_path__` workaround for fetched data.

## Out of scope

- Moving the yelp dataset or the 4-pathway alien dataset to core.
- The Trace a Case network weights (NPW-32).
- A React hook, a shared cache, or any view that consumes the data.
