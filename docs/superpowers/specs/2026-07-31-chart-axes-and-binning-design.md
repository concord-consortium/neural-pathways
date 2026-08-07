# Correlation Drill-Down Charts: Axes, Binning, and Hover

## Overview

The correlation drill-down charts render without any value axis, and the histogram
bins discrete data as if it were continuous. Both defects make a chart that is
technically correct unreadable in practice.

This design adds a shared x-axis to the stacked histograms, numeric endpoints to
the scatter plot, a categorical binning mode for discrete columns, and a hover on
every histogram bar reporting its value and count.

## The Problem

Selecting **Review stars × Business stars** in the correlations view produces five
stacked histogram rows, one per review-star value. Within each row the bars are the
distribution of business star ratings — but nothing on screen says so, because
neither chart renders a value axis. The reader sees bars and cannot tell what they
measure.

Worse, the bars appear as a comb. `compareGroups` bins the column into
`DEFAULT_BIN_COUNT = 20` equal-width bins over the pooled range. Business stars take
half-star values, so with a range of [1.0, 5.0] each bin spans 0.2 and the values
land in bins 0, 2, 5, 7, 10, 12, 15, 17, and 19 — nine occupied bins separated by
empty ones. The gaps carry no information; they are an artifact of binning discrete
data on a continuous scale.

## Design Decisions

**Categorical bars, not adaptive bin widths.** A discrete column gets one bar per
distinct value, evenly spaced. The rejected alternative — keeping a numeric axis but
setting the bin count to the number of distinct values — only removes the comb when
the values happen to be evenly spaced. Values of 1, 2, and 100 would still comb
badly. The cost of the chosen approach is that the axis stops being a number line,
so unequal gaps between values are no longer visible; that is an acceptable trade
for data that is genuinely categorical.

**Separate thresholds for rows and columns.** Rows stack vertically and columns sit
side by side, so they tolerate different counts. The existing
`MAX_DISTINCT_FOR_GROUPS = 10` governs how many group rows the drill-down will
render. A new `MAX_DISTINCT_FOR_BARS = 20` governs categorical bars, matching
`DEFAULT_BIN_COUNT` so categorical mode never renders more bars than numeric mode
would have.

**Native `<title>` for hover, not a custom tooltip.** The correlation matrix already
uses the browser's native tooltip for its full-precision `r` and `n`. Matching it
keeps the two surfaces consistent and adds no hover state, positioning logic, or
tests. The cost is the browser's delay before the tooltip appears and no control
over its styling.

**The axis is HTML, not SVG.** The histograms use `preserveAspectRatio="none"`, so
any SVG text inside them would be horizontally stretched along with the bars.

## Statistics Layer

`compareGroups` gains a bin mode. `GroupComparison.binEdges` is replaced by a
discriminated union so a consumer physically cannot read edges in categorical mode:

```ts
export type Bins =
  | { mode: "categorical"; values: number[] }
  | { mode: "numeric"; edges: number[] };

export interface GroupComparison {
  groups: GroupSummary[];
  bins: Bins;
  separationSd: number | null;
}
```

- `categorical`: `values` holds the distinct usable column values, ascending, one per
  bar. `values.length === counts.length`.
- `numeric`: `edges` holds the bin boundaries as today.
  `edges.length === counts.length + 1`.

**Mode selection.** Count the distinct usable values among the pooled column values.
At or below `MAX_DISTINCT_FOR_BARS` the mode is categorical; above it, numeric.

**Alignment is preserved by construction.** Bins are derived once from the pooled
values across all groups, and every group's `counts` array is indexed against that
same shared list. Bin *i* therefore means the same thing in every row, which is what
lets a single axis sit beneath the stack. This already held for numeric mode and must
continue to hold for categorical.

**Empty input** returns `{ groups: [], bins: { mode: "numeric", edges: [] }, separationSd: null }`,
preserving today's behavior for a comparison with no usable pairs.

`separationSd` is unaffected: still defined only for exactly two groups with a
nonzero pooled standard deviation.

## Axis Helpers

A new `src/explorer/utils/axis.ts` holds two pure functions, used by both charts and
unit-tested without rendering:

```ts
/** Trims trailing zeros: 1.5 -> "1.5", 3 -> "3", 0.333 -> "0.33". */
export function formatAxisValue(value: number): string;

/** Indices to label, thinned to at most maxLabels, always including the last. */
export function selectTickIndices(count: number, maxLabels: number): number[];
```

`selectTickIndices` uses `step = Math.ceil(count / maxLabels)` and selects index `i`
when `i % step === 0`, plus the final index. For `count <= maxLabels` every index is
selected.

## Distribution Comparison

### Shared axis row

The axis renders **once, beneath the bottom histogram**, as a real row of the
existing `80px 1fr 160px` grid: an empty label cell, the axis in the `1fr` cell, and
an empty stats cell. This guarantees it aligns with the bars rather than
approximating that alignment.

The `separationSd` line currently fakes its alignment with `padding-left: 90px`. It
moves into the same grid row structure.

Axis content by mode:

- **Categorical** — one tick label per bar, positioned to match the bar centers,
  thinned via `selectTickIndices(barCount, 10)`.
- **Numeric** — `edges[0]` at the left end and `edges[edges.length - 1]` at the
  right, and nothing between them.

### Bar hover

Each bin renders two rects: the visible value bar, then a transparent full-height hit
target painted on top and carrying the `<title>`.

```jsx
<rect className="explorer-group-bar" x={x} y={barTop} width={w} height={barHeight}
      data-testid="group-bar" />
<rect className="explorer-group-hit" x={x} y={0} width={w} height={BAR_AREA_HEIGHT}
      data-testid="group-bar-hit">
  <title>Business stars 2.5 — 142 reviews</title>
</rect>
```

SVG elements do not honor the HTML `title` attribute — a `<title>` child element is
required. The matrix works today because its cells are HTML `<td>`.

Because the hit target spans the full column height, a bin whose count is 0 in a
given row is still hoverable and reports `0 reviews`, which is itself informative.

`.explorer-group-hit` must set `pointer-events: all` in SCSS. With `fill: transparent`
the default `visiblePainted` behavior is inconsistent across engines.

Title text by mode:

- **Categorical** — `{scoreLabel} {value} — {count} reviews`
- **Numeric** — `{scoreLabel} {binMin} to {binMax} — {count} reviews`

### New prop

`DistributionComparison` gains `scoreLabel: string`, the name of the column variable,
which it needs for the title text and does not currently receive. `CorrelationsView`
passes `selected.col.label`.

## Scatter Plot

Both axes gain numeric endpoints, with the variable names kept as titles:

- Left column: max at top, variable name in the middle, min at bottom.
- Bottom row: min at left, variable name centered, max at right.

Values are formatted with `formatAxisValue`. The left grid column is currently
`60px`, sized for a bare variable name; it widens to fit a formatted number beside
the name without the two overlapping. The exact width is an implementation detail —
the binding requirement is that the y-axis minimum, maximum, and name are all legible
and non-overlapping at the panel's normal width.

## Testing

**`statistics.test.ts`** — mode selection at the boundary (20 distinct values yields
categorical, 21 yields numeric); categorical emits one bar per distinct value in
ascending order; unevenly-spaced values (1, 2, 100) yield three equal bars rather
than a comb; numeric mode's edges are unchanged from today; every group's `counts`
has the same length in both modes.

**`axis.test.ts`** — `formatAxisValue` trims trailing zeros and rounds to two
decimals; `selectTickIndices` returns every index when the count fits, thins when it
does not, and always includes the final index.

**`distribution-comparison.test.tsx`** — the axis renders exactly once for a stack of
several groups; categorical mode renders a tick per bar; thinning applies above the
label limit; numeric mode renders min and max only; every bin has a hit rect carrying
a `<title>`; a zero-count bin is still hoverable.

**`scatter-plot.test.tsx`** — min and max labels render on both axes with the correct
values.

**`playwright/workspace.test.ts`** — selecting Review stars × Business stars shows
evenly spaced labelled bars with no empty gaps, which is the case that prompted this
work.

## Not in Scope

- The row-side threshold of 10 and the row routing rule are unchanged.
- Per-group peak scaling of bar heights is unchanged.
- No count or y-axis labels on the histograms; the per-row `n = …` text carries
  magnitude.
- No gridlines or tick marks beyond the labels themselves.
- No hover on scatter points. With roughly 6,400 points, overlapping marks make it
  arbitrary which one a pointer hits; doing it properly needs nearest-point detection,
  which is more work than this change warrants.
- The scatter's points remain slightly elliptical, a consequence of
  `preserveAspectRatio="none"`, and its fit-line endpoints remain unclamped.

## Amendment (2026-07-31)

**Mode selection is no longer cardinality alone.** Categorical mode now requires
both that the pooled column have at most `MAX_DISTINCT_FOR_BARS` distinct values
*and* that those values repeat — `distinct.length * 2 <= pooled.length`, i.e. each
value appears at least twice on average. A single distinct value stays categorical
unconditionally, since there is no spread to bin.

**Why.** The original rule counted cardinality over the *filtered* reviews, not the
whole dataset. Narrowing a search to roughly 15 results and opening **Review rating
× P0** made `pathway_0` — a continuous NMF score — render as an evenly spaced
categorical axis, indistinguishable from the genuinely discrete Business rating case,
because 15 rows cannot have more than 15 distinct values. Few distinct values is not
evidence of discreteness; repetition is.

**Axis precision raised to three decimals.** `formatAxisValue` rounded to two, so
clustered pathway scores such as 0.412 / 0.415 / 0.418 produced three adjacent bars
whose tick labels *and* hover titles all read `0.41`. Three decimals matches the
`toFixed(3)` convention used everywhere else the app prints pathway scores. Axis ticks
also gained `text-overflow: ellipsis`, so a label too wide for its cell is marked as
truncated rather than centre-clipped into a different number.
