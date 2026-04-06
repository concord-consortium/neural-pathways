# Explorer Advanced Search Interface

## Overview

Add a structured search interface to the explorer app so researchers can query across reviews using field-based criteria (stars, city, categories, pathway scores, etc.), view a filtered result list, and drill into individual reviews for detailed pathway/SHAP analysis.

The search engine is [liqe](https://github.com/gajus/liqe), a Lucene-like query parser that operates on in-memory JavaScript objects. Researchers type structured queries in a text input and results update live.

## Use Case

Researchers are trying to find meaning in the pathways. The search enables hypothesis testing — e.g., "pathway 2 seems related to service quality" can be tested by querying `pathway_2:>0.8` and examining the matching reviews' text and SHAP values.

## Layout

### Top Bar
- Fit selector (existing, relocated to top bar)
- Search text input spanning remaining width
- Result count indicator (e.g., "247 of 7,012")

### Left Panel (new)
- Scrollable list of result cards showing filtered reviews
- Each card: text snippet (~80 chars) + pathway score badges for current fit (show all pathways; if space is tight, wrap to additional lines)
- Clicking a card selects it and loads it in the detail view
- Selected card highlighted with left border accent and background change
- Collapsible via toggle button to reclaim horizontal space

### Right Side (existing, unchanged)
- ReviewPanel, PathwayPanel, WordEffectsPanel
- No changes to SHAP loading, pathway visualization, or word effects

## Data Layer: Flattened Search Objects

For each `S3Review`, a flat object is created scoped to the currently selected fit:

```json
{
  "text": "Great service...",
  "stars": 5,
  "review_stars": 5,
  "name": "Joe's Pizza",
  "city": "Phoenix",
  "state": "AZ",
  "categories": "Restaurant, Pizza",
  "target_label": "positive",
  "pathway_0": 0.82,
  "pathway_1": 0.34,
  "pathway_2": 0.56,
  "reconstruction_r2": 0.91
}
```

Flattened objects are recomputed whenever the selected fit changes. With ~7,000 reviews this is cheap.

## Search Component

Replaces the existing `ReviewSelector` (react-select dropdown):

- Plain text input in the top bar
- Parses query on every keystroke using liqe's `parse()`
- On parse failure: subtle red border on the input, keeps last valid results displayed
- On parse success: runs `filter()` against flattened objects, updates result list
- Empty query shows all reviews in the results list
- Placeholder text with example query: `stars:5 AND pathway_0:>0.8`

### Example Queries

- `pathway_0:>0.8` — reviews where pathway 0 scores high
- `stars:1 AND pathway_2:>0.5` — low-rated reviews with strong pathway 2
- `categories:Restaurant AND city:Phoenix` — location/category filtering
- `text:pizza AND pathway_0:>0.5` — text + pathway score

## Results Panel Behavior

- When results change (new query or fit change), if the currently selected review is still in the filtered set it stays selected; otherwise selection is cleared
- Start with a simple rendered list; add virtualization later if performance is an issue

## URL State

URL hash updates to include the search query alongside existing params:
`#review=XX&fit=YY&q=stars:5`

This lets researchers bookmark and share searches.

## Removed Components

- `ReviewSelector` (react-select dropdown) — fully replaced by search input + results panel
- `react-select` dependency can be removed if nothing else uses it

## Fit Change Behavior

When the selected fit changes:
- Flattened search objects are recomputed with the new fit's pathway scores
- The current search query is automatically re-evaluated against the new data
- Query field names (`pathway_0`, `pathway_1`, etc.) map to whichever fit is selected

## Dependencies

- Add: `liqe` — Lucene-like query parser and filter
- Remove: `react-select` (if unused elsewhere after `ReviewSelector` removal)
