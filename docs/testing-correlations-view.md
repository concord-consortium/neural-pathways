# Manually Testing the Correlations View

A walkthrough for checking the correlations view by hand. It covers the matrix, the
drill-down charts, the axes, the bar hover, and the binning logic that decides which
chart you get.

The correlations view answers a question the review-by-review view cannot: which
attributes and pathways move together across the whole set of reviews. Each section
below says what you should see and, where it matters, what would count as a problem
worth reporting.

Two pieces of notation appear throughout. **`r`** is the correlation between two
things, running from -1 to 1, where 0 means no relationship. **`n`** is how many
reviews a given number was computed from.

## 1. The matrix

Click **Correlations** in the top bar.

- The header reads `Correlations over 6427 of 6427 reviews`.
- A square grid appears. Rows and columns are the same series in the same order:
  five attributes — **Review rating**, **Business rating**, **Actual sentiment**,
  **Model was correct**, **Synthetic review** — followed by one column per pathway in
  the selected fit, labelled `P0`…`P5` or `P0`…`P6` depending on the fit.
- A **heavier border** separates the attribute block from the pathway block, on both
  axes.
- The **diagonal is grey and unclickable**. Clicking a cell against itself does
  nothing.
- Cells are colored by `r` — blue negative, red positive — with the value to two
  decimals.

Hover any cell for the full-precision `r` and that cell's `n`.

## 2. The partial-coverage dot

Look at the **Model was correct** row and column.

- Its cells carry a **small corner dot** that other cells do not.
- Hover one: `n` reads around **3,000**, not 6,427. Only reviews with both a
  prediction and a ground-truth label have a value for this attribute.
- A cell in the **Review rating** row has **no dot** and `n = 6427`.

The dot appears when a cell's `n` falls below 95% of the reviews in scope. Without it
you would have to hover every cell to discover that a correlation covers half the
data. If every cell has a dot, or none do, something is wrong.

## 3. Filtered scope

Type `model_correct:0` into the search box.

- The header changes to `Correlations over 145 of 6427 reviews`.
- The whole matrix recomputes; values visibly change.

**The interesting case.** While that filter is active, look at the **Model was
correct** row. Every review in scope now has the same value, so the series has zero
variance and its correlations are undefined. Those cells must show **`—`**, be
**unclickable**, and look clearly different from a cell whose `r` genuinely is `0.00`.

That distinction is the single most important thing on this screen. A correlation of
exactly zero and an undefined correlation mean completely different things, and if
they ever look alike, that is a real bug.

Clear the search before continuing.

## 4. Which drill-down chart you get

Click any off-diagonal cell that is not `—`. A summary line appears above the chart
naming the pair, `r`, and `n`.

The chart is chosen by how many different values the **row** variable takes — up to 10
gives grouped histograms, more gives a scatter. Review rating has only five possible
values and Business rating about nine, so both get histograms; a scatter would stack
thousands of points on a handful of positions and show you nothing.

### a. A binary row — grouped histograms with real labels

Click **Actual sentiment × P0**.

- Two histogram rows labelled **`negative`** and **`positive`** — *not* "no"/"yes".
  The labels come from the dataset config, so each attribute reads in its own terms.
- Each row shows `n = …` and `mean …`, with a `…σ` separation line below.

Click **Model was correct × P0**. That one *should* read `no` / `yes`, because that is
what its values mean.

### b. Unequal groups stay readable

Still on **Model was correct × P0**: the groups are roughly 145 against 2,850. Both
histograms should reach **comparable visual height**.

Each row is scaled to its own tallest bar, so you are comparing the *shape* of the two
distributions, with the true counts in the `n = …` text. If the smaller group renders
as a flat line against a full-height neighbor, report it — the comparison it exists to
support has been lost.

### c. A low-cardinality number — histograms, not a scatter

Click **Review rating × P0**.

- **Five stacked histogram rows**, one per star value, each labelled with its raw
  value.
- No `…σ` line — separation is only defined for exactly two groups.

### d. A continuous row — scatter with a fit line

Click a pathway against a pathway, e.g. **P1 × P0**.

- A scatter of roughly 6,400 points with a red fitted line.

## 5. The x-axis

Every chart carries a value axis. This is what tells you what the bars actually
measure.

**On the grouped histograms:** exactly **one axis**, beneath the **bottom** row of the
stack — not one per row. All rows share the same bins, so one axis is correct for all
of them, and the labels line up with the bar centers.

Check the alignment by eye: a tick should sit under the middle of its bar, and the
`…σ` line below should start at the same left edge as the bars.

**On the scatter:** the minimum and maximum at both ends of **both** axes, with the
variable names kept as titles — max at top-left, min at bottom-left, min at
bottom-right of the x-axis, max at far right.

Numbers show up to three decimals with trailing zeros trimmed, so you see `3`, `1.5`,
and `0.412` rather than `3.000`, `1.50`, and `0.41`.

## 6. Bar hover

Hover any bar in a grouped histogram. A tooltip reports the column variable, the value
or bin range, and the count:

```
Business rating 2.5 — 142 reviews
```

Three things to check:

- **Empty bars still respond.** Hover a gap where a row has no observations for a
  value that other rows do have — for instance a business rating that no 1-star review
  hit. It should report `— 0 reviews` rather than nothing. Each bar has an invisible
  full-height hit target, so there is always something under the pointer.
- **The whole column is hoverable**, not just the colored part of the bar.
- **In numeric mode the tooltip names a range**, e.g. `P0 -1.204 to -0.881 — 37
  reviews`, rather than a single value.

The tooltip is the browser's native one, so expect the usual short delay before it
appears. That matches the correlation matrix's cell tooltips.

## 7. Binning: why bars look the way they do

This is the subtlest part of the view and the easiest to misread.

**Discrete columns get one bar per distinct value**, evenly spaced. Click **Review
rating × Business rating**: business ratings take half-star values, so you should see
roughly nine bars with **no gaps between them**, each labelled with its own value.

If instead you see bars separated by empty gaps, in a comb pattern, report it. Those
gaps are meaningless — they appear when nine real values are spread across twenty
evenly-spaced slots, leaving eleven of them empty — and they make the distribution
look far patchier than it is.

**Continuous columns get 20 equal-width bins**, and the axis shows only the range ends
rather than a label per bar.

**What decides which:** a column is treated as discrete only when it has at most 20
different values **and** those values repeat — each one appearing at least twice on
average. Repetition is what distinguishes a genuinely discrete measure, like a star
rating, from a continuous one that merely looks discrete because the search narrowed
it to a handful of reviews.

**Worth testing deliberately**, because it is the case most likely to go wrong. Search
something narrow enough to return roughly 15-20 reviews, then click a pathway column,
e.g. **Review rating × P0**. Those fifteen pathway scores are all distinct, so they
*look* discrete by count alone — but they are continuous values that happen to be
sparse. You should get **numeric bins with two end labels**, not fifteen evenly-spaced
categorical bars.

Getting evenly-spaced bars there would mean continuous values are being drawn as
categories, with the axis implying an even spacing the data does not have.

**A known trade-off, not a bug:** the same rule can treat a genuinely discrete column
as continuous when the sample is very small — filter to 10 reviews that happen to hit 6
different business ratings and you will get bins rather than 6 bars. This is the safe
direction to err in: bins waste some space, but evenly-spaced bars would imply a
spacing the data does not have.

## 8. Layout

- The correlations panel fills the width to the right of the results list, with no
  dead gap at the right edge.
- **Narrow the browser window** until the matrix no longer fits. The *matrix* should
  scroll horizontally inside its own box; the **page itself must not** grow a
  horizontal scrollbar.

## 9. Sharing and reloading a view

The web address updates as you work, so a correlations view can be bookmarked or
pasted to a colleague.

- With the view open, the address ends in `#view=correlations`, plus the current fit
  and search terms.
- **Reload the page** — you land back in Correlations, with the same search still
  applied.
- **Paste that address into a new tab** — it opens straight into Correlations.
- Switch back to **Explore** and the `view=` part disappears, so older links that
  predate this feature still open in Explore as they always did.

---

## Known rough edges — already known, no need to report

- **Clicking a review in the results list while in Correlations mode appears to do
  nothing.** The row highlights, but the correlations view does not change. Switch to
  Explore to see the review you picked.
- **The hover is mouse-only.** Per-bar values cannot be reached by keyboard, and screen
  readers get one description of each chart rather than per-bar detail.
- **A count of 1 reads as "1 reviews".**
- **Attribute chips in the Explore view still label Actual sentiment as yes/no**
  rather than negative/positive, unlike the drill-down.
- **Histograms have no count axis.** Each row is scaled to its own tallest bar, so bar
  heights are *not* comparable between rows — a full-height bar might be 3 reviews in
  one row and 900 in another. The `n = …` text on each row carries the real magnitude.
- **Scatter points render as slight ellipses** rather than circles, because the plot
  area is stretched to fit.
