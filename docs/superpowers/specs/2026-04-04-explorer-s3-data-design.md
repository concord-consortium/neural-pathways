# Explorer S3 Data Migration

Migrate the explorer visualization from bundled static JSON files to the S3-hosted review data format, supporting ~6,400 reviews with selectable FA fits, on-demand SHAP loading, and graceful handling of reviews without word effect data.

## Data Source

**Base URL:** `https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/`

Files used by the explorer:
- `index.json` (~7.7 MB) — all review metadata + FA fit parameters
- `shap/{fa-fit}/{bucket}.json` (256 files per fit) — per-word SHAP scores

The explorer does not use activation bucket files (those are heatmap-only).

See `docs/data/s3-data-format.md` for the full schema.

## Shared Data Loader

Move S3 fetching infrastructure from `src/heatmap/utils/data-loader.ts` to `src/shared/data-loader.ts`. Both apps use the same index and base URL. All fetchers live in the shared module:

- `fetchIndex()` — fetch and return `index.json`
- `fetchActivations(reviewId, cache)` — fetch activation bucket (heatmap)
- `fetchShap(reviewId, fitName, cache)` — fetch SHAP bucket (explorer)
- `fitToPathways(fit)`, `fitToScaler(fit)`, `fitToMetadata(fit)` — type translators (heatmap)
- `standardizeActivations(raw, mean, scale)` — computation helper (heatmap)
- `BASE_URL` constant

S3 types move to `src/shared/types/s3-data.ts`:
- `S3Index`, `S3FaFit`, `S3Review`, `ActivationBucket` (existing)
- `S3ShapBucket`, `S3ShapReview` (new)

Update `S3FaFit` to include new fields:
- `pathway_score_min: number[]` — per-pathway minimum score across all reviews
- `pathway_score_max: number[]` — per-pathway maximum score across all reviews

Update `S3Review` to include:
- `has_shap?: string[]` — list of fit names with SHAP data for this review, omitted if none

Update heatmap imports to point to `src/shared/data-loader.ts` and `src/shared/types/s3-data.ts`.

### SHAP Fetching

`fetchShap(reviewId, fitName, cache)`:
1. Compute bucket from `reviewId.slice(0, 2)`
2. Cache key: `${fitName}/${bucket}` (SHAP buckets are per-fit)
3. If not cached, fetch `shap/${fitName}/${bucket}.json`, cache it
4. Find review by ID in bucket, return its SHAP data
5. Throw if review not found

### SHAP Types

```typescript
interface S3ShapBucket {
  reviews: S3ShapReview[];
}

interface S3ShapReview {
  id: string;
  base_values: number[];
  unmasked_values: number[];
  words: Array<{ word: string; scores: number[] }>;
}
```

### Component-Facing SHAP Type

```typescript
interface ReviewShapData {
  words: Array<{ word: string; scores: number[] }>;
  base_values: number[];
  unmasked_values: number[];
}
```

Passed as a prop to `WordEffectsPanel` rather than being read from the review object.

## Data Loading

### Startup
Fetch `index.json` on app load. Show a loading indicator until it completes.

### On Review Selection
If `review.has_shap` includes the current fit name, eagerly fetch `shap/{fitName}/{bucket}.json` (if not cached). Extract the review's SHAP data. While loading, disable pathway clicking and show a loading state.

### On Fit Change
If the currently selected review has SHAP for the new fit, fetch that fit's SHAP bucket (if not cached). If not, clear SHAP data and disable pathway selection.

## FA Fit Selection

A `<select>` in the top bar. Lists all fits from `metadata.fa_fits`. Defaults to the first fit (or from URL hash).

### What changes when fit changes
- Pathway scores — from `review.pathway_scores[fitName]`
- Number of pathways — layout adjusts (6 vs 7)
- Variance fractions — from `review.pathway_variance_fractions[fitName]`
- Reconstruction R² — from `review.reconstruction_r2[fitName]`
- Scale extents — from `fit.pathway_score_min` / `fit.pathway_score_max`
- SHAP availability — re-evaluated per `review.has_shap`
- Selected pathways — reset (pathway indices differ across fits)
- SHAP data — re-fetched or cleared

### What stays the same
Review text/metadata, display settings (scale mode, word color mode, etc.).

## URL Hash Params

Format: `#review={id}&fit={fitName}`

- Read on startup: if hash contains valid review ID and fit name, use them as initial selections
- Update on change: `history.replaceState` when review or fit changes
- Same pattern as the heatmap implementation

## SHAP Availability UI

Three states based on selected review + fit:

### Has SHAP for current fit
Pathway clicking enabled. Word effects panel works as today.

### No SHAP for current fit, but has SHAP for other fits
- Pathway bars shown but clicking disabled (visual dimming, default cursor)
- Clear any previously selected pathways
- Where word effects panel would appear, show message:
  "No word effects for [current fit]. Available for: [fit1], [fit2]"
- Fit names rendered as clickable links that switch to that fit

### No SHAP for any fit
- Pathway bars shown but clicking disabled
- Message: "No word effects available for this review"

## App State

### New state
- `indexData: S3Index | null` — fetched index, null while loading
- `selectedFitName: string` — active FA fit name
- `selectedReviewId: string | null` — selected review by hex ID
- `shapCache: Map<string, S3ShapBucket>` — cached SHAP bucket fetches, keyed by `{fit}/{bucket}`
- `currentShapData: ReviewShapData | null` — SHAP data for selected review+fit, null if unavailable or loading
- `shapLoading: boolean` — whether SHAP fetch is in progress

### Unchanged state
`selectedPathways`, `scaleMode`, `showScores`, `showScaleExtents`, `showVarianceFractions`, `wordColorMode`, `wordScaleScope`

## Component Changes

| Component | Changes |
|-----------|---------|
| `app.tsx` | Replace static import with async fetch. Add fit selector, SHAP cache, hash params. Derive scores/variance/R²/extents from selected fit. Manage SHAP state. Pass new props to panels. |
| `review-selector.tsx` | Accept `S3Review[]`. Use `id` instead of `index` for option value. |
| `review-panel.tsx` | Accept `S3Review`. Handle nullable fields. R² from per-fit prop. |
| `pathway-panel.tsx` | Accept `disabled` prop to pass through to bars. Scale extents from fit metadata. |
| `pathway-bar.tsx` | Add `disabled` prop — prevents click, visual dimming. |
| `word-effects-panel.tsx` | Accept `ReviewShapData` as separate prop. Show availability messages. Render fit-switch links. |
| `word-effect-display.tsx` | No changes. |
| `settings-menu.tsx` | No changes. |
| `color-scale.tsx` | No changes. |
| `score-to-color.ts` | No changes. |

## Deleted Files
- `src/explorer/explorer_data_with_words.json` (10 MB)
- `src/explorer/explorer_data.json` (4.4 MB)
- `src/explorer/types/explorer-data.ts` (dead types after migration)
- `src/heatmap/utils/data-loader.ts` (moved to shared)
- `src/heatmap/types/viz-data.ts` — remove S3 types (`S3Index`, `S3FaFit`, `S3Review`, `ActivationBucket`), keep heatmap component types (`Metadata`, `Pathways`, `Scaler`), update imports to use `src/shared/types/s3-data.ts`

## New/Moved Files
- `src/shared/data-loader.ts` — all S3 fetch functions (moved from heatmap + new SHAP fetcher)
- `src/shared/data-loader.test.ts` — tests (moved from heatmap + new SHAP tests)
- `src/shared/types/s3-data.ts` — all S3 type definitions (moved from heatmap + new SHAP/has_shap types)
