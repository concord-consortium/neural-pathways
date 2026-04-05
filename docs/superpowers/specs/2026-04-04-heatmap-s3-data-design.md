# Heatmap S3 Data Migration

Migrate the heatmap visualization from a bundled static JSON file to the S3-hosted review data format, enabling access to ~6,400 reviews with multiple FA fits.

## Data Source

**Base URL:** `https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/`

Three file types:
- `index.json` (~7.7 MB) — all review metadata + FA fit parameters
- `activations/{bucket}.json` (256 files) — raw 780-dim activation vectors
- `shap/{fa-fit}/{bucket}.json` — per-word SHAP (not used by heatmap)

See `../NNMaker/browser-data/s3-data-format.md` for the full schema.

## Data Loading

### Startup
Fetch `index.json` on app load. Show a loading indicator until it completes. This provides:
- All review metadata (text, sentiment, business info, pathway scores per fit, R² per fit)
- All FA fit parameters (loadings, noise variance, scaler mean/scale, explained variance)

### Activation Fetching
When a user selects a review:
1. Compute bucket from `review.id[:2]`
2. Check client-side cache (`Map<string, BucketData>`)
3. If not cached, fetch `activations/{bucket}.json` and cache the full bucket (~25 reviews)
4. Extract the selected review's raw activations

Sections that don't need activations (pathway patterns, pathway scores, scored pathways) render immediately from index data. Sections that need activations (original activations, reconstructed, residual, R², scaler view) show a loading/placeholder state until the fetch completes.

### Standardized Activations
Computed client-side: `standardized[i] = (raw[i] - scaler_mean[i]) / scaler_scale[i]` using the selected FA fit's scaler parameters.

## FA Fit Selection

A `<select>` dropdown in the toolbar, before the existing scale controls. Lists all fits from `metadata.fa_fits` (currently `train-fa-6`, `test-fa-7`, `dev-fa-6`). Defaults to the first fit.

### What changes when fit changes
- Pathway loadings (pattern heatmaps) — from `fit.loadings`
- Number of pathways — grid layout adjusts (e.g. 6 vs 7)
- Pathway scores — from `review.pathway_scores[fitName]`
- Explained variance per pathway — from fit
- Noise variance — from fit (per-neuron, length 780)
- Scaler mean/scale — from fit
- Reconstruction R² — from `review.reconstruction_r2[fitName]`
- Scored pathways, sum, residual — recomputed
- Standardized activations — recomputed with new scaler

### What stays the same
Raw activations, review text/metadata, scale/color settings.

### Score overrides
Reset when fit changes (same as review change), since pathway indices have different meanings across fits.

## Review Selection

Replace the current `<select>` dropdown in ReviewPanel with a `react-select` searchable combobox, matching the explorer app's pattern:
- Each review shown as `"{index}: {first ~60 chars of text}"`
- Searchable by text content or index number
- `isSearchable`, `isClearable` enabled

Reviews identified by `id` (12-char hex SHA-256) rather than array index.

## Data Translation Layer

A `data-loader.ts` module handles fetching and translating S3 data into shapes existing components expect.

### FA fit to component types

| S3 field | Component-facing shape |
|----------|----------------------|
| `fit.loadings` | `Pathways.components` (n_pathways x 780) |
| zeros(780) | `Pathways.mean` (780) — FA mean is ~0 after standardization, so use a zero vector to keep reconstruction code unchanged |
| `fit.noise_variance` | `Pathways.noise_variance` (780) |
| `fit.scaler_mean` | `Scaler.mean` |
| `fit.scaler_scale` | `Scaler.scale` |
| `fit.n_pathways` | `Metadata.n_pathways` |
| `fit.explained_variance_total` | `Metadata.explained_variance_total` |
| `fit.explained_variance_per_pathway` | `Metadata.explained_variance_per_pathway` |
| 780 (constant) | `Metadata.n_neurons` |

### Review to component types

| S3 field | Component-facing shape |
|----------|----------------------|
| `review.id` | Used for identity/bucket lookup |
| `review.text` | `Review.text` |
| `review.target` | `Review.target` |
| `review.target_label` | `Review.target_label` |
| `review.sources` | `Review.source` (display which sets) |
| `review.pathway_scores[fitName]` | `Review.pathway_scores` |
| `review.reconstruction_r2[fitName]` | `Review.reconstruction_r2` |
| bucket activations | `Review.activations_raw` |
| computed from raw + scaler | `Review.activations_standardized` |

### Dropped fields
- `neuron_layers` — not used in current visualization, can add to S3 data later if needed

## App State

### New state
- `indexData: S3Index | null` — fetched index, null while loading
- `selectedFitName: string` — active FA fit name
- `selectedReviewId: string | null` — selected review by hex ID
- `activationCache: Map<string, BucketData>` — cached bucket fetches
- `currentActivations: number[] | null` — raw activations for selected review, null while loading

### Unchanged state
`scoreOverrides`, `scaleType`, `valueScaling`, `scaleMode`, `showStats`, `showScaler`, `terminologyMode`

## Scale Mode Change

Drop the "same across reviews" scale mode. With lazy-loaded activations, a global absMax across all reviews can't be computed upfront. The remaining modes:
- `current-review` — all sections scale to current review's max
- `multiple-scales` — each section has independent scale (default)

## Component Changes

| Component | Changes |
|-----------|---------|
| `app.tsx` | Replace static import with async fetch. Add FA fit selector. Derive Pathways/Scaler/Metadata from selected fit. Conditionally render activation-dependent sections. Remove globalAbsMax and "same-across-reviews" mode. |
| `review-panel.tsx` | Replace `<select>` with react-select combobox. Accept S3 review array. Show business metadata when available. |
| `pathway-grid.tsx` | No changes |
| `heatmap.tsx` | No changes |
| `scored-pathways-view.tsx` | No changes |
| `color-legend.tsx` | No changes |
| `terminology.ts` | No changes |
| `reconstruction.ts` | No changes |

## New Types (in `viz-data.ts`)

```typescript
interface S3Index {
  metadata: {
    fa_fits: Record<string, S3FaFit>;
    review_sets: Record<string, { count: number; description: string }>;
  };
  reviews: S3Review[];
}

interface S3FaFit {
  source_split: string;
  n_pathways: number;
  explained_variance_total: number;
  explained_variance_per_pathway: number[];
  loadings: number[][];       // n_pathways x 780
  noise_variance: number[];   // 780
  scaler_mean: number[];      // 780
  scaler_scale: number[];     // 780
}

interface S3Review {
  id: string;
  sources: Record<string, number[]>;
  text: string;
  target: number | null;
  target_label: string | null;
  name?: string;
  city?: string;
  state?: string;
  stars?: number;
  review_stars?: number;
  categories?: string;
  pathway_scores: Record<string, number[]>;
  reconstruction_r2: Record<string, number>;
  pathway_variance_fractions: Record<string, number[]>;
}

interface ActivationBucket {
  reviews: Array<{ id: string; activations: number[] }>;
}
```
