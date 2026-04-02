# Word Effects Visualization Design

## Purpose

Add per-word pathway score highlighting to the explorer app. When a user selects a review and toggles one or more pathways, the review text is displayed with each word colored to show that pathway's SHAP-derived score for the word. This reveals which words drive each pathway's activation.

## Data Source Change

Switch from `explorer_data.json` to `explorer_data_with_words.json`. The new file contains 1,842 reviews (test set only, those with SHAP data) instead of 5,700. The new file adds these fields per review:

- `words`: array of `{ word: string, scores: number[] }` — one entry per token, with a score per pathway
- `base_values`: `number[]` — SHAP baseline per pathway (all tokens masked)
- `unmasked_values`: `number[]` — pathway scores with all tokens present

The metadata gains a `word_effect_metric` object describing the score semantics. The `exemplars` field is removed. Pathway count changes from 6 to 7.

The `ExplorerReview` type is updated to include the new fields. Existing fields (`index`, `source`, `text`, `target_label`, `pathway_scores`, `reconstruction_r2`, `pathway_variance_fractions`, `name`, `city`, `state`, `stars`, `review_stars`, `categories`, `rating`) remain unchanged.

## Layout

The existing two-column layout is preserved. The word effects section is added to the left column, below the ReviewPanel:

```
┌─────────────────────────────────────────────────────┐
│  [Review Selector]                            [⚙]   │
├──────────────────────────────────┬──────────────────┤
│  Review Panel                    │  Pathway Panel   │
│  (text, badges, stars, etc.)     │  (7 bars, now    │
│                                  │   clickable)     │
├──────────────────────────────────┤                  │
│  Word Effects Panel              │                  │
│  ┌────────────────────────────┐  │                  │
│  │ Pathway 0                  │  │                  │
│  │ colored word spans...      │  │                  │
│  ├────────────────────────────┤  │                  │
│  │ Pathway 3                  │  │                  │
│  │ colored word spans...      │  │                  │
│  └────────────────────────────┘  │                  │
└──────────────────────────────────┴──────────────────┘
```

The word effects section only appears when at least one pathway is selected. Each selected pathway gets a labeled block with the full review text rendered as colored spans, stacked vertically.

## Pathway Selection

Pathway bars in the PathwayPanel become clickable toggles. Clicking a bar adds/removes that pathway index from the selected set.

**Visual indicator for selected state:** Blue border (`#5b9bd5`) and light blue background (`#f0f6ff`) on selected bars. Unselected bars have a transparent border to preserve layout. All bars show `cursor: pointer`.

No limit on the number of pathways that can be selected simultaneously.

## Word Coloring

Each word is rendered as a `<span>` with an inline `background-color` computed from its score for the given pathway.

**Color mapping:** `scoreToColor(score: number, maxAbsScore: number) => string`
- Positive scores: `rgba(231, 76, 60, alpha)` (red)
- Negative scores: `rgba(52, 152, 219, alpha)` (blue)
- `alpha = abs(score) / maxAbsScore`, clamped to [0, 1]
- Score of zero: transparent (white background shows through)

**Scale scope (initial):** `maxAbsScore` is computed per-review, per-pathway — the maximum absolute value among all word scores for that pathway in the selected review. This means each pathway block has its own scale.

**Token filtering:** `[CLS]` and `[SEP]` tokens (BERT tokenizer artifacts) are excluded from rendering.

**Future extensions (out of scope):**
- Impact-based coloring using `base_values`/`unmasked_values`
- Alternative color scales (multi-hue, logarithmic)
- Configurable scale scope (global across reviews, shared across pathways)

## New Components

### WordEffectsPanel

Container for word effect blocks. Receives the selected review and the set of selected pathway indices. Renders one `WordEffectDisplay` per selected pathway, stacked vertically. Renders nothing when no pathways are selected.

### WordEffectDisplay

Renders a single pathway's word effects for a review. Receives the pathway index and the review's `words` array.

- Header: pathway label (e.g., "Pathway 0") with a colored bottom border
- Body: the review text as a sequence of `<span>` elements, each with a background color from `scoreToColor`. Words are space-separated. Line height should be generous (~2) to keep colored backgrounds from colliding across lines.

## Component Changes

### PathwayBar

- Add `onClick` callback prop (receives pathway index)
- Add `selected` boolean prop
- Apply selected styling (blue border, light background) when `selected` is true
- Add `cursor: pointer` styling

### App

- Add `selectedPathways: Set<number>` state
- Pass toggle handler and selection state down to PathwayPanel/PathwayBar
- Pass selected review and selected pathways to WordEffectsPanel
- Update data import from `explorer_data.json` to `explorer_data_with_words.json`
- Update scale extent computations for 7 pathways instead of 6

### Type Updates

- Add `words`, `base_values`, `unmasked_values` fields to `ExplorerReview`
- Add `word_effect_metric` to metadata type
- Remove `exemplars` from `ExplorerData`
- Update `n_pathways` references from 6 to 7

## State

New state in App component:
- `selectedPathways: Set<number>` — indices of toggled pathways (initially empty)

Toggle handler: if the pathway index is in the set, remove it; otherwise, add it. Create a new `Set` on each toggle to trigger React re-render.

## Testing

### WordEffectDisplay
- Renders spans with correct background colors for known positive/negative scores
- Filters out `[CLS]` and `[SEP]` tokens
- Handles empty words array gracefully

### WordEffectsPanel
- Renders one labeled block per selected pathway
- Renders nothing when no pathways are selected

### PathwayBar
- Click handler fires with correct pathway index
- Selected state applies the visual indicator styles

### App Integration
- Toggling pathway bars updates the selected set
- Word effects section appears when pathways are selected and a review is chosen

## Technology

No new dependencies. Uses the same React + TypeScript + SCSS stack. The `scoreToColor` utility is a pure function that can live in a shared utility file.
