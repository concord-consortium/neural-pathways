# Field Stats View — Design

## Overview

A third view mode, **Fields**, showing what the current search selected: for every attribute
and every pathway, how the filtered items are distributed compared with the dataset as a whole.

The explorer already tells you *which* items matched — the results list — and, in the
Correlations view, how variables move together across them. It says nothing about any single
field on its own. A student who filters to the reviews the model got wrong cannot see that
those reviews are 62% one-star, or that a coding they just commissioned is three times as
common inside the selection as outside it. That is the first question anyone asks of a subset,
and it currently has no answer in the app.

This sits outside the phase 1–7 build order in
[the overview](2026-07-30-attributes-and-alien-dataset-overview.md). It authors no data, adds
no attribute, and changes no existing view.

Three uses, all served by the same surface:

- **Characterize a selection** — "what are these 145 reviews like?"
- **Compare against everything** — "how do they differ from the other 2,855?"
- **Learn what fields exist** — with an empty query, the view is a field directory showing
  each field's range and shape.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Placement | A **third view mode**, `Fields`, beside Explore and Correlations | The toggle, the `#view=` param, and the always-present results panel already exist. It also gets full main-area width, which a histogram per pathway needs. |
| Field scope | **Exactly what `buildSeries` produces** — visible attributes then pathways | `model_correct` is already an attribute on both datasets, so "% the model got right" needs no new plumbing. Reading `dataset.attributes` also means hidden codings stay hidden here without this view knowing hiding exists. |
| Layout | **Master–detail**: scrolling field list on top, histograms for the selected field below | Structurally identical to the Correlations view's matrix-then-drilldown, including the click-to-see prompt. Thirty-odd fields do not fit on one screen as full charts. |
| Baseline | **All items**, not the items excluded by the filter | "The rest" is statistically cleaner — `all` contains the subset, so the contrast is diluted — but "all 3,000 reviews" is the number a student can hold in their head, and at realistic filter sizes the two barely differ. |
| Bin source | **The baseline, computed once per dataset + fit** | Bins derived from the subset would rescale every axis on each keystroke, and the two histograms would not be comparable — which is the entire point of the view. |
| Bar scaling | **Each histogram against its own peak** | The convention `distribution-comparison.tsx` already set, for the same reason: 145 items against 3,000 on a shared peak flattens the subset into an unreadable line, and the subset is the interesting one. Every row prints its own `n`. |
| Interaction | **Selection only.** Clicking a row opens its detail | Clicking a bar to append a search clause is an appealing filter-builder, but it is a separate feature with its own query-composition questions. Nothing here forecloses it. |
| Selected field | **Component state, not URL state** | Matches how the matrix's `selectedCell` behaves. A shared link carries the dataset, fit, query, and codings — the things worth reproducing. |

## The View

### Header

`Fields over 145 of 3,000 reviews`, mirroring `explorer-correlations-header` in wording and
placement so the two views read as siblings. The item noun comes from `dataset.config.itemNoun`.

### The field list

A container with a `max-height` that scrolls independently, so the detail pane below is always
on screen. One row per series, **visible attributes in dataset-config order, then pathways
P0..Pn-1**, with a separator at the boundary — the same ordering contract the correlation
matrix relies on. The boundary is found from `series.kind` rather than by counting attributes,
so it stays correct if a commissioned coding changes the list length mid-session.

Each row is a button carrying four things:

| Part | Content |
|---|---|
| Label | `series.label`, with `series.description` as the hover title, as the matrix does |
| These | The subset's headline number |
| All | The baseline's headline number, in the same units |
| Sparkline | The subset's distribution, no axis |

The headline number depends on the field:

- **Binary** — the share of items whose value is `1`, labelled with `valueLabels[1] ?? "yes"`.
  So `target` reads `positive 38%` and `model_correct` reads `yes 0%`.
- **Integer, float, and pathways** — `mean 2.9`.

The two kinds of number sit in the same two columns, headed *these* and *all*, so the column
scans vertically even though adjacent rows are not the same kind of quantity.

The sparkline uses the **same baseline-derived bins as the detail pane**, so the shape scanned
in the list is the shape that appears when the row is clicked, only larger. It shows the subset
alone — there is nothing to share a peak with — and renders nothing when the selection has no
values for that field.

### The detail pane

For the selected field: the label and full description, then two histograms stacked — `these
145` above `all 3,000` — sharing one axis built with `formatAxisValue` and `selectTickIndices`,
exactly as the existing group histograms do. Each row prints `n`, mean, min, and max. Bars
carry full-height hit targets with a `<title>` giving the bin range and its count, matching
`barTitle` in `distribution-comparison.tsx`.

Before anything is selected the pane shows a prompt — `Click a field to see its distribution.`
— in the shape of `explorer-drilldown-prompt`.

This is a new component rather than a reuse of `DistributionComparison`. That component's props
are group-shaped: *one* column split by the distinct values of another. This is a different
question — *one* field over two overlapping item sets — and forcing it through the group API
would mean lying about what the two rows are. The visual language is shared; the props are not.

## Statistics

### Splitting bin choice from counting

`compareGroups` currently chooses bins inline (`statistics.ts`, the block deriving `distinct`,
`categorical`, `bins`, `barCount`, and `indexOf`). That logic — one bar per distinct value when
the values repeat, equal-width bins otherwise — is exactly what this view needs, and it should
not be written twice.

Extract it:

```ts
export interface BinPlan {
  bins: Bins;
  barCount: number;
  /** Bar index for a value. Clamps, so an out-of-range value lands in an end bar. */
  indexOf: (value: number) => number;
}

/** Returns null when nothing in values is usable — there is no plan to make. */
export function chooseBins(values: (number | null)[], binCount?: number): BinPlan | null;
```

`compareGroups` then calls `chooseBins(pooled)` and its `pooled.length === 0` early return
becomes the `null` case. Its behaviour is unchanged, and **its existing tests are the guard for
the refactor** — they must pass untouched.

Counting into a plan becomes its own function:

```ts
export interface FieldStats {
  /** Items with a usable value. */
  n: number;
  mean: number;
  min: number;
  max: number;
  /** Counts per bar, aligned with the plan's bins. */
  counts: number[];
}

/** Returns null when nothing in values is usable. */
export function summarize(values: (number | null)[], plan: BinPlan): FieldStats | null;
```

Two functions rather than one `describeField(subset, baseline)` because the split is what makes
the design's central invariant structural: **a plan can only be made from one set of values and
then applied to another**, so binning from the subset is not an expression anyone can write by
accident. It also puts the expensive half — planning over 3,000 values per field — behind a
memo that a keystroke does not invalidate.

### How the view uses them

```ts
// Memoized on the baseline series alone. Typing does not touch this.
const plans: Map<string, { plan: BinPlan; baseline: FieldStats }>

// Memoized on the subset series and plans. Recomputed as the query changes.
const subsets: Map<string, FieldStats | null>
```

Both keyed by `series.key`. The two series lists are index-aligned by construction — same
`dataset.attributes`, same `nPathways` — but keying by name costs nothing and does not depend
on that continuing to be true.

A field with **no usable values anywhere** has no plan. Its row still renders, greyed, with no
numbers and no sparkline: that is what makes the view work as a field directory for an
attribute that does not apply to the current dataset's items.

The subset is a subset of the baseline, so its values are always within the plan's range. If
that ever ceased to hold, `indexOf` clamps rather than writing outside `counts`.

## App Changes

`ViewMode` gains `"fields"`. Three places in `app.tsx` decide a view and all three must learn
the new member:

| Place | Change |
|---|---|
| The index-fetch effect's `hashParams.view === "correlations"` check | Parse any valid mode, not just correlations |
| The `hashchange` handler's ternary | The same |
| The series memo's `viewMode !== "correlations"` guard | Build for `correlations` **or** `fields` |

The first two collapse into one `parseViewMode(value): ViewMode` helper beside
`parseCommissioned`, so a fourth view cannot be half-added. `updateHash` needs no change — it
already writes any view that is not `explore`.

A second memo builds the baseline series over `indexData.items`, keyed on the index, the
dataset, the fit name, and the fit — **and gated on `viewMode === "fields"`**, so Explore and
Correlations pay nothing for it. The cost is one `buildSeries` over the full index, which
recomputes on entering the view; that is a few milliseconds once, against a per-keystroke cost
in a view that is not open.

Note that `dataset` is in the key deliberately: commissioning a coding changes
`dataset.attributes`, and the baseline must gain the same row the subset just gained.

## Edge Cases

| Case | Behaviour |
|---|---|
| Query matches nothing | The list is replaced by `No reviews match this search.` — not thirty empty histograms |
| Selected field has no values in the selection | The detail's baseline histogram still renders; the subset row reads `none in this selection` |
| Field has no values anywhere | Row renders greyed, label only; not selectable |
| Selected field disappears after a fit or commissioning change | Selection resolves to nothing, via the `series.find` → `null` pattern the correlations drilldown already uses |
| Search parse error | Already handled upstream — `app.tsx` falls back to all items, so the subset equals the baseline and every row shows two identical numbers, which is truthful |

## Testing

**`statistics.test.ts`** — `compareGroups`'s existing cases pass unchanged, which is the whole
point of doing the extraction first. New cases for `chooseBins` (the categorical-versus-numeric
rule at its documented boundaries, a single distinct value, all-null input) and for `summarize`
(counts aligned to a foreign plan, `n`/mean/min/max, all-null input, a value outside the
plan's range clamping into an end bar).

`summarize` deliberately reports no standard deviation: nothing in this view displays one, and
a spread statistic contrasting a set with a superset that contains it invites exactly the
misreading the *all-items* baseline choice already accepts. `GroupSummary.sd`, which
`compareGroups` needs for `separationSd`, is untouched.

**One test carries the design's central claim:** plan once from a baseline, then summarize two
different subsets against it, and assert both results share bin edges. That is the property
that makes the histograms comparable, and it is invisible in any single-set test.

**Component tests**, following the existing pattern — `field-list-row.test.tsx` (binary renders
a percentage with its value label, numeric renders a mean, a bar per bin in the sparkline, the
greyed no-data row), `field-detail.test.tsx` (two histograms, axis ticks, the numbers line, the
`none in this selection` state), `fields-view.test.tsx` (attribute-then-pathway order and the
separator, the prompt before selection, selection surviving a query change, selection dropping
when its key disappears, the zero-match message).

**`app.test.tsx`** — the toggle renders three buttons, `#view=fields` round-trips on load and
on `hashchange`, and switching to Fields does not disturb the results panel.

Worth one Playwright test end to end: search for `model_correct:0`, confirm the header counts
the subset, click the Review rating row, and confirm the two histograms differ.

## Walkthrough

Per the standing requirement, this ships `docs/testing-fields-view.md`: how to open the view
and read a row; what *these* and *all* mean and why the baseline is all items rather than the
excluded ones; why the axis does not move as you type; why the two histograms in the detail are
scaled independently and how to avoid misreading that; the empty-query reading as a field
directory; and a worked example following the curriculum path — filter to `model_correct:0`,
scan for the field where *these* and *all* diverge most, open it.

## Out of Scope

- Clicking a bar to add a clause to the search box.
- Persisting the selected field in the URL.
- Any change to the Correlations view, the matrix, or the regression panel.
- Stats over non-numeric fields — `text`, `city`, `state`, `categories`.
- Medians, quartiles, box plots, or significance tests. Mean, sd, min, max, and the shape.
- Exporting or copying the numbers.
