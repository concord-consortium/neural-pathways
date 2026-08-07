# Alien Dataset in the App — Design (Phase 5)

## Overview

The explorer learns to load more than one dataset. It gains a dataset selector, loads the
generated alien conversations from `dist/alien-data/`, shows the observer's field note, and
takes its item noun and classification labels from the dataset rather than hard-coding
Yelp's.

Phase 4 produced the data and no UI. This phase produces no data. It is done when a person
can open the explorer at `#dataset=alien`, search and filter 800 conversations, select one,
read its note, see its nine attributes, and run the correlation and regression views against
them — with the Yelp dataset still working exactly as it does today.

See [2026-07-30-attributes-and-alien-dataset-overview.md](2026-07-30-attributes-and-alien-dataset-overview.md)
for the surrounding project and
[2026-08-03-alien-dataset-generator-design.md](2026-08-03-alien-dataset-generator-design.md)
for the data this consumes.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| App shape | One explorer, `#dataset=` param plus a visible selector | A separate webpack entry would duplicate the shell and force every later phase to be wired twice. The App component is already parameterized by its data. |
| Default dataset | **Yelp** | The bare explorer URL keeps its current meaning. The alien data is untuned until phase 7, so defaulting to it would point new visitors at data that does not teach yet. |
| Internal noun | `item` | `conversation` is wrong for Yelp and `review` is wrong for alien. The visible noun comes from the dataset; the code uses a neutral one. |
| Wire format | Unchanged | `index.json` keeps its `reviews` key. `fetchIndex` renames it once on the way in, so neither the format doc nor the Yelp index on S3 has to change. |
| Old `#review=` links | Not supported | This is a pre-release research tool; carrying an alias for a param nobody has bookmarked is not worth the branch. |
| Note placement | Below the conversation text, in the same panel | Matches the fiction: the recording is the item, the note is the observer's annotation of it. |
| Hidden attributes | **Shown** in this phase | Concealing them is phase 6's entire job. Seeing `resource_stressed` now is how we confirm the data teaches before building the machinery that hides it. |

## Data Source and Dataset Selection

`BASE_URL` stops being a module constant. `DatasetConfig` carries a `baseUrl` and the two
loader functions take the dataset:

```ts
fetchIndex(dataset: DatasetConfig): Promise<S3Index>
fetchShap(dataset: DatasetConfig, itemId: string, fitName: string,
          cache: Map<string, S3ShapBucket>): Promise<ItemShapData>
```

`fetchActivations` is heatmap-only and takes the dataset on the same footing, but the
heatmap always passes Yelp.

| Dataset | `baseUrl` |
|---|---|
| Yelp | `https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/` |
| Alien | `alien-data/` |

**The alien URL is relative with no leading slash.** Deployed pages live at
`.../branch/<name>/explorer.html`, and the generated data is published alongside them at
`.../branch/<name>/alien-data/`. A root-absolute path would miss. The dev server already
serves `dist/` statically, so this works in development with no config change.

### The registry

A single module lists the datasets and resolves the hash param:

```ts
export const DATASETS: Record<string, DatasetConfig> = { yelp: yelpDataset, alien: alienDataset };
export const DEFAULT_DATASET_ID = "yelp";
export function datasetFromId(id: string | undefined): DatasetConfig;
```

An unknown id falls back to the default rather than erroring — a mistyped link should show
something, not a dead page.

### Switching

Changing the dataset clears the item selection, the search query, and the selected pathways,
and selects the new dataset's first fit. **View mode persists**: Explore versus Correlations
is a statement about how you are looking, not about what you are looking at.

`#dataset=` joins the existing hash params. It is omitted from the URL when the dataset is
the default, so Yelp URLs keep their current shape.

The FA-fit selector hides itself when a dataset declares only one fit. The alien data has
exactly one, `alien-fa-4`, and a select with a single option is furniture.

## DatasetConfig

```ts
interface DatasetConfig {
  id: string;
  label: string;                                     // "Yelp Reviews" / "Alien Conversations"
  baseUrl: string;
  /** Lowercase. A capitalize() exported from this module handles heading use. */
  itemNoun: { singular: string; plural: string };
  /** How to name the model's predicted class. */
  classificationLabels: Record<number, string>;
  /** The attribute list, which one dataset authors and the other reads from its data. */
  resolveAttributes(index: S3Index): AttributeDefinition[];
  getAttributeValue(item: S3Item, key: string): number | null;
}
```

`classificationLabels` is `{ 0: "negative", 1: "positive" }` for Yelp and
`{ 0: "wait", 1: "approach" }` for alien. It replaces the hard-coded ternary in
`flattenReview` and in the panel's prediction badge.

### Why `resolveAttributes` replaces the static array

The two datasets get their definitions from different places. Yelp authors all five in
client code, derived from fields already in its index. Alien reads nine from
`metadata.attributes`, which the generator wrote, and adds two it derives. A static array
cannot express the second case, because the list is not known until the index has loaded.

The list now arrives over the network, so `validateAttributeKeys` runs at resolve time
rather than at module load. A generated attribute whose key collided with a reserved search
field, or with a derived one, fails loudly instead of silently shadowing it.

### ActiveDataset

Resolution needs the index, but every consumer wants one object. The app builds it once:

```ts
interface ActiveDataset {
  config: DatasetConfig;
  /** Resolved for this index, in display order. */
  attributes: AttributeDefinition[];
  getAttributeValue(item: S3Item, key: string): number | null;
}
export function activateDataset(config: DatasetConfig, index: S3Index): ActiveDataset;
```

`flattenItem` and `buildSeries` take an `ActiveDataset` where they currently take a
`DatasetConfig`, so their signatures keep their shape and their bodies stop reaching for a
field that no longer exists.

## The Alien Dataset Config

```ts
export const alienDataset: DatasetConfig = {
  id: "alien",
  label: "Alien Conversations",
  baseUrl: "alien-data/",
  itemNoun: { singular: "conversation", plural: "conversations" },
  classificationLabels: { 0: "wait", 1: "approach" },

  resolveAttributes(index) {
    const merged = [...derivedAttributes, ...(index.metadata.attributes ?? [])];
    validateAttributeKeys(merged);
    return merged;
  },

  getAttributeValue(item, key) {
    switch (key) {
      case "target":
        return item.target;
      case "model_correct":
        if (item.classification == null || item.target == null) return null;
        return item.classification === item.target ? 1 : 0;
      default:
        return item.attributes?.[key] ?? null;
    }
  },
};
```

### Derived attributes

The generator emits nine attributes. It does **not** emit `target` or `model_correct`, and
`model_correct` is the single most important field in the activity — "filter to the errors
and three quarters of them are resource-stressed" is the discovery the whole dataset was
built to support. Both are derived client-side, exactly as the Yelp config already derives
its own:

| Key | Label | Type | Value labels | Source |
|---|---|---|---|---|
| `target` | Actual answer | binary | `{0: "wait", 1: "approach"}` | `item.target` |
| `model_correct` | Model was correct | binary | `{0: "no", 1: "yes"}` | `classification === target`, null if either is absent |

`getAttributeValue` handles those two by name and falls through to `item.attributes?.[key]
?? null` for everything else, so a retune that adds or renames a generated attribute needs
no client change.

### Display order

Derived attributes come first, then the nine from the data in generator order. The
correlation matrix opens with `target` and `model_correct` against the pathways rather than
burying the outcomes under nine observations.

### Hidden attributes are visible

All nine appear, `resource_stressed` included, so the planted bias is immediately findable.
Phase 6 owns concealment. Anyone reviewing this phase should expect to see it.

## The Rename

The internal noun becomes `item`. The visible noun comes from `DatasetConfig.itemNoun`.

| Scope | Treatment |
|---|---|
| `src/shared/types`, `src/shared/data-loader` | Renamed. `S3Review`→`S3Item`, `S3ShapReview`→`S3ShapItem`, `ReviewShapData`→`ItemShapData`, `S3Index.reviews`→`items`. `fetchIndex` maps the wire key once. |
| `src/explorer/**` | Full rename — component and file names (`review-panel`→`item-panel`), props, state, utils (`flatten-review`→`flatten-item`), and the `#item=` hash param. |
| `src/heatmap/**` | Only what the shared modules force: the renamed type names, and passing `yelpDataset` to the loaders. Its own `review-panel.tsx` and `terminology.ts` keep their names — the heatmap is Yelp-only, it shows reviews, and renaming there is churn against code the alien work never reaches. |

Roughly 45 files mention "review" today, most of them tests, so the bulk of this diff is
mechanical.

### Visible strings that become noun-driven

| Location | Yelp | Alien |
|---|---|---|
| `correlations-view` result count | `6 of 6431 reviews` | `6 of 800 conversations` |
| Explorer empty state | `Select a review from the results…` | `Select a conversation from the results…` |
| `pathway-panel` legend | `This Review` | `This Conversation` |
| `search-input` help, `text` row | `Review text` | `Conversation text` |

## The Item Panel

`review-panel.tsx` → `item-panel.tsx`. Its Yelp chrome — star ratings, business name,
categories, reconstruction R² — is already conditionally rendered and self-hides on alien
data. Three changes:

1. **The observation note**, below the conversation text, under its own label, rendered only
   when `item.observation` is present.
2. **The prediction badge** reads `classificationLabels` rather than a hard-coded ternary.
3. **`white-space: pre-line`** on the item text. Alien conversations separate turns with
   newlines, and the current CSS collapses them into one run-on line.

### Deliberate non-features

Two things that would be natural to add and would quietly defeat phase 6:

- **`observation` does not become a searchable field.** Every attribute, hidden ones
  included, is attested in the note by a fixed phrase. A searchable note would let anyone
  recover `resource_stressed` for all 800 conversations from one fragment, which is exactly
  the work phase 6 exists to commission deliberately.
- **The results list keeps showing conversation text, not the note.** A column of alien
  words scans poorly, but the pathway bars beside each card are the real scanning aid, and
  note snippets in the list would put that same shortcut permanently on screen.

Both are a few lines to reverse if they read badly in use.

### A correctness fix while in here

`flattenReview` writes `reconstruction_r2: 0` when the field is absent. On alien data that
makes `reconstruction_r2:0` match every conversation and lists a meaningless field in the
search help. The flattened field becomes optional — written only when the item has the data
— and its help row is hidden for datasets without it.

## Testing

Most test churn is the mechanical rename. Coverage worth adding:

- Dataset selection from the hash, including the unknown-id fallback and the omission of
  `#dataset=` for the default.
- `activateDataset` merging generated definitions with derived ones, preserving display
  order, and throwing when a generated key collides.
- Alien `getAttributeValue`: derived keys, data-carried keys, and an unknown key.
- The loader building both URL shapes from the dataset.
- The item panel rendering the note when present, omitting the block when absent, and
  labeling the prediction from the dataset.
- `flattenItem` omitting `reconstruction_r2` rather than defaulting it to zero.

An end-to-end check that `#dataset=alien` loads, filters, and selects a conversation is
worth one Playwright test; it needs `npm run generate:alien` to have run first.

## Walkthrough

Per the overview's standing requirement, this phase ships `docs/testing-alien-explorer.md`:
how to generate the data and open the alien dataset, what each panel shows, how the
attributes and the note appear, how to reach the bias through the correlation and regression
views, and confirmation that Yelp still behaves as before. It is a new document rather than
an extension of `docs/testing-correlations-view.md`, which is Yelp-specific.

## Out of Scope

- Attribute visibility and commissioned coding. Phase 6. The `hidden` flag is in the data
  and this phase ignores it.
- Tuning correlation strengths. Phase 7.
- Heatmap support for the alien dataset. It needs activation files, which the generator
  deliberately does not emit.
- LLM-written observation notes. The generator's `NoteRenderer` seam exists; the renderer
  does not.
- Any change to the S3 data format or to the Yelp index.
