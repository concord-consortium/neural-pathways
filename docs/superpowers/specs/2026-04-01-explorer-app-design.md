# Pathway Explorer App Design

## Purpose

An interactive tool for browsing Yelp reviews and seeing how neural network pathways "explain" each review. Users select a review, see its full details, and view the pathway scores as mini bar graphs. This builds understanding of what each pathway captures.

## Data Source

`src/explorer/explorer_data.json` containing:

- **metadata**: 6 pathways, 780 neurons, explained variance stats
- **reviews** (5,700): each with `index`, `source` (train/test), `text`, `target_label` (positive/negative), `pathway_scores` (array of 6), `reconstruction_r2`, `pathway_variance_fractions` (array of 6), plus business fields (`name`, `city`, `state`, `stars`, `review_stars`, `categories`, `rating`)
- **exemplars**: 5 per pathway (not used in initial version)

## Layout

Top-to-bottom structure:

1. **Top bar**: filterable search input (left) + gear icon settings button (right)
2. **Main area**: two-column side-by-side layout
   - **Left**: review detail panel (takes remaining space)
   - **Right**: pathway scores column (fixed width)

## Components

### Review Selector (top bar, left)

A text input that acts as a filterable dropdown. The user types to filter the review list, which matches against:
- Review index number (e.g., typing "719" matches review #719, #7190, #1719)
- Beginning of review text (e.g., typing "pizza" matches reviews starting with text containing "pizza")

The dropdown shows matching reviews formatted as: `#<index> <truncated text>`, limited to the first 50 matches to keep rendering fast. Selecting an item loads that review. On initial load, no review is selected — the user must pick one.

### Review Panel (left column)

Displays all details for the selected review:

- **Classification badge**: the `target_label` value ("positive" or "negative")
- **Source badge**: "train" or "test"
- **Star ratings**: `review_stars` shown as star icons, `stars` (business rating) shown separately
- **Full review text**
- **Business info**: `name`, `city`, `state`
- **Categories**: the `categories` string
- **Reconstruction R²**: the `reconstruction_r2` value

### Pathway Scores Panel (right column)

A vertical column of 6 pathway rows, one per pathway. Each row contains:

- **Label**: "Pathway 0" through "Pathway 5"
- **Mini bar graph**: a horizontal bar inside a rounded-corner rectangle border
  - A vertical center line at the midpoint represents zero
  - Positive scores extend a **red** bar to the right of center
  - Negative scores extend a **blue** bar to the left of center
  - Bar length is proportional to the score magnitude
- **Numeric score**: the raw score value displayed below or beside the bar
- **Variance fraction** (optional, toggled via settings): shown as a percentage on the row (e.g., "98.3%")

The rows are styled as rounded rectangles with borders to visually suggest they will become clickable buttons in the future.

#### Scale Modes

Two modes, toggled in settings:

- **Shared scale**: all 6 bars use the same scale, determined by the global min and max across all pathway scores for all reviews. This makes magnitudes comparable across pathways.
- **Per-pathway scale**: each bar's scale is determined by the min and max of that specific pathway across all reviews. This reveals relative position within each pathway's range.

The scale min/max values should be precomputed from the full dataset on load.

### Settings Menu (gear icon, top bar right)

A gear icon button that opens a popover panel on click. Contains:

- **Scale Mode**: radio buttons — "Shared scale" / "Per-pathway scale"
- **Display**: checkbox — "Show variance fractions"

The popover closes when clicking outside of it.

## Technology

- React + TypeScript, consistent with the existing heatmap app
- SCSS for styling, following the existing pattern
- Data loaded via JSON import (the file is bundled by Webpack)
- No external UI component libraries — plain HTML elements styled with CSS

## File Structure

New/modified files under `src/explorer/`:

- `components/app.tsx` — top-level layout, state management, data loading
- `components/review-selector.tsx` — filterable search input + dropdown
- `components/review-panel.tsx` — review detail display
- `components/pathway-panel.tsx` — vertical column of pathway score rows
- `components/pathway-bar.tsx` — individual mini bar graph
- `components/settings-menu.tsx` — gear icon + popover with controls
- SCSS files alongside each component

## State

Managed in the App component:

- `selectedReview`: the currently selected review object (or null)
- `searchQuery`: the current filter text in the search input
- `scaleMode`: "shared" | "per-pathway"
- `showVarianceFractions`: boolean
- `settingsOpen`: boolean (popover visibility)

Precomputed on load:
- `sharedScaleExtent`: [min, max] across all pathway scores for all reviews
- `perPathwayExtents`: array of 6 [min, max] values, one per pathway
