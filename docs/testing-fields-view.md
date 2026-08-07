# Manually Testing the Fields View

A walkthrough for checking the fields view by hand. It covers opening the view, reading a
row, why the two columns are shaped the way they are, the axis, the paired histogram in the
detail pane, and the empty query as a directory of the dataset.

The fields view answers a narrower, blunter question than Correlations: for one attribute or
pathway at a time, how does the current search selection compare to the whole dataset? Where
Correlations finds which pairs of things move together, Fields is the place to check whether a
single thing looks different for the reviews you just filtered to — the first thing worth
looking at once a search has narrowed things down.

One piece of notation carries over from `docs/testing-correlations-view.md`: **`n`** is how many
reviews (or conversations, in the alien dataset) a number was computed from. **mean** is new
here — the average value, printed for every field that isn't binary (§2).

## 1. Opening the view

Click **Fields** in the top bar, next to Explore and Correlations.

- The header reads `Fields over 6427 of 6427 reviews` with nothing searched.
- The address bar gains `#view=fields`. **Reload the page** and you land back in Fields, the
  same way `#view=correlations` survives a reload. **Paste that address into a new tab** and it
  opens straight into Fields.
- Switch back to **Explore** and the `view=` part disappears, exactly as it does for
  Correlations — a link from before this feature existed still opens in Explore.

## 2. Reading a row

Below the header sits a scrolling list, one row per attribute and then one row per pathway, with
a sticky header labelling the two number columns **these** and **all**:

- **these** is the field's value over the current search selection — the subset a reader just
  asked for.
- **all** is the same field over the entire dataset, regardless of what's searched.
- A **sparkline** on the right is the *selection's* shape only — there's no baseline shape to
  pair it with in the list, just the selection's own bars scaled to their own tallest bar.

How a field's single number reads depends on its type. A **binary field reads as a
percentage** of the value it names: `model_correct` shows `yes 95%`, not `mean 0.95` — "95% of
these are correct" is the sentence a reader already forms, and "mean 0.95" makes them convert it
back. Every other field, pathways included, **reads as a mean**: `review_stars` shows
`mean 3.027`.

With nothing searched, **these** and **all** are identical on every row, because the selection
*is* the whole dataset — see §6 below.

## 3. Why the baseline is all items, not the excluded ones

Type `model_correct:0` into the search box and click **Review rating** (`review_stars`). The
detail pane opens with two histograms and a numbers line under each:

```
n = 145 · mean 2.428 · min 1 · max 5
n = 5995 · mean 3.027 · min 1 · max 5
```

The second row is the whole dataset, not "the 5,850 reviews the filter excluded." That's a
deliberate choice, and it's the one most likely to look wrong at first glance: leaving the 145
in the "all" side dilutes the contrast slightly, since the selection is already part of what it's
being compared to. But **"all 6427 reviews" is a number a reader can hold in their head** across
every field they click, in a way "everything except this selection" is not — its size doesn't
shift as the search changes, and it answers the more useful question anyway: not "how does this
selection differ from its complement" but "how does this selection differ from the dataset as a
whole." A 145-item subtraction from a 6,427-item baseline is not a comparison worth the extra
bookkeeping.

One wrinkle that follows from this: the **all** column's label always shows the dataset's total
item count — `all 6427` — for every row, so it reads the same no matter which field is open. But
the `n` printed just below it is that field's *own* count of usable values, which can be smaller.
`review_stars` is undefined for the 432 synthetic reviews in the dataset (they were never given a
star rating), so its baseline row reads `all 6427` above `n = 5995` right underneath. That is not
a bug — it's the same "a field's `n` can fall short of the full count" idea `docs/testing-
correlations-view.md` §2 covers for the correlation matrix's partial-coverage dot, just without a
visual marker for it here. If a field's printed `n` is ever *larger* than the dataset total, or a
row with zero missing values shows an `n` short of the total, that's worth reporting.

## 4. Why the axis does not move as you type

Switch back to an empty search, then type slowly into the search box while the detail pane for
some field is open. The bars resize as the count in each bin changes, but the **axis underneath —
its ticks, its range — stays exactly where it was.**

That's because bins are computed once from the whole dataset (the **all** side) and then reused
for whatever the selection currently is, rather than recomputed from the selection on every
keystroke. Two things follow from that. First, it's what makes the two histograms comparable at
all: if the selection rebinned itself independently, a narrow filter could produce different bin
edges than the baseline, and the two shapes would no longer be measuring the same thing. Second,
it's cheap — the expensive half of the work (deciding the bins) happens once when you switch into
the view, and every keystroke after that only has to recount, not rebin 6,427 reviews. The shape
you scanned when you opened the field is the shape you clicked; narrowing the search moves bars
inside it, never the ruler they're measured against.

One thing the axis does change is what it calls a value. Open **Actual sentiment** (`target`) and
its two ticks read `negative` and `positive` rather than `0` and `1`, and hovering the right-hand
bar reads `Actual sentiment positive — 2998 reviews`. Those names come from the dataset's own
value labels — the same ones behind the row's `positive 50%` headline — so the axis, the hover
text, and the headline all say the same word for the same thing. Two fallbacks are deliberate and
worth confirming rather than reporting: a field whose dataset declares no labels keeps its
numbers (`Review rating`'s ticks stay `1`–`5`), and so does any individual value the dataset
left unnamed, since showing a number is honest where inventing a name would not be. The
Correlations drill-down labels its shared axis the same way, from whichever field runs along it.

## 5. Why the two histograms are scaled independently

Look again at the **Review rating** detail pane from §3. The `these` histogram (145 reviews) and
the `all` histogram (5,995) are drawn to visibly comparable heights, even though one set is about
40 times the size of the other.

Each histogram is scaled to **its own tallest bar**, not to a peak shared between the two. A
shared peak would flatten the 145-review selection into a near-flat line next to the full
dataset's bars — and the selection is the one a reader opened the pane to look at. The trade-off
is the one thing to watch for: **bar heights compare *within* a row, never *across* the two
histograms.** A full-height bar in the `these` row might be 60 reviews; a full-height bar in the
`all` row a few pixels below it might be 900. That is exactly why **each row prints its own `n`**
in the numbers line beneath it — the true magnitude lives in the text, not in the pixels. Reading
"the bars are about the same height, so the counts must be similar" is the one mistake this
layout invites; the `n = …` text is there to catch it every time.

## 6. The empty query as a field directory

Clear the search box entirely and scroll the list from the top. With nothing searched, `these`
and `all` are identical on every row — this is what makes the fields view double as a directory
of the dataset itself: every declared attribute and pathway, its range, and its shape, all in one
scroll, independent of any particular search.

- `review_stars` (**Review rating**): `mean 3.027`, one to five stars.
- `stars` (**Business rating**): `mean 3.668`.
- `target` (**Actual sentiment**): `positive 50%`.
- `prediction` (**Predicted sentiment**): `positive 52%`. Together with the rows on
  either side of it, `Actual sentiment`, `Predicted sentiment`, and `Model was
  correct` read as a set: what was true, what the model said, and whether those
  agreed.
- `model_correct` (**Model was correct**): `yes 95%`.
- `is_synthetic` (**Synthetic review**): `yes 7%`.
- Six pathway rows, `P0`–`P5`, whose means are all small but not all alike: they run from
  `mean -0.187` (`pathway_3`) up to `mean 0.302` (`pathway_1`), with `pathway_0` nearest zero at
  `mean -0.002`. Pathway scores are centred by construction, so expect small numbers here —
  a pathway reading a mean of 5, or 50, is worth reporting.

A field the dataset declares but has **no values for anywhere** still appears as a row — greyed
out and unclickable, a `<div>` rather than a button, because there is no distribution behind it
to open. That state exists for a dataset that declares an attribute it never actually populated;
neither shipped dataset currently has one, so you won't see a greyed row on Yelp or the alien
dataset today — every declared field has at least some values. If one ever does appear, confirm
it renders (not crashes) and that clicking it does nothing, rather than opening an empty pane.

A second, more extreme empty state exists for a dataset that declares **no attributes at all**
and whose fit has **zero pathways** — the list itself is replaced by a message rather than
rendering nothing. This, too, is a fixture-only state today (the app tests construct it, but
neither Yelp nor the alien dataset can reach it), the same way Correlations has an analogous
empty state for the same reason.

## 7. A worked example on Yelp

Clear the search box, then type `model_correct:0`. The header reads
`Fields over 145 of 6427 reviews` — the same 145 misclassified test-split reviews the
correlations walkthrough uses.

Scan down the attribute block for a row where `these` and `all` visibly diverge. `Model was
correct` itself reads `yes 0%` in **these** against `yes 95%` in **all (2,998 with a value)** —
the biggest swing on the screen, but not an interesting one: every review left in the selection
has `model_correct = 0` by construction, since that's the clause that produced the selection.
(This is the same "the filtered field goes constant" case `docs/testing-correlations-view.md` §3
calls out for the correlation matrix.) Note that 2,998, not 6,427: `model_correct` is only
defined for reviews having both a prediction and a ground-truth label, so its own `n` — printed
in the detail pane as `n = 2998` under the `all 6427` label — falls well short of the scope
header's count, exactly as §3 describes. Skip past it and the next clear divergence is
**Review rating**:

| | these (145) | all (5,995 with a value) |
|---|---|---|
| mean | 2.428 | 3.027 |

Click the row. The detail pane opens with the title **Review rating**, two histograms, and the
numbers line quoted in §3 above. The selection's shape visibly shifts toward the low-star bars
compared to the full dataset's — the reviews the model got wrong skew about six tenths of a star
lower on average than reviews generally. That's the kind of finding this view exists to surface:
not *why* the model was wrong on these reviews, but a concrete, numeric lead — lower-rated
reviews — worth chasing into Correlations or the individual reviews themselves.

Clear the search before continuing.

## 8. A worked example on the alien dataset

Switch the `Dataset:` dropdown to **Alien Conversations**, or navigate directly to
`#dataset=alien&view=fields`. The header reads `Fields over 800 of 800 conversations` — the noun
comes from the dataset, same as everywhere else in the app.

Scroll the list: only eight attribute rows appear — `Actual answer`, `Predicted answer`,
`Model was correct`, `Voices raised`, `Engaged in a task`, `Group size`, `Near water`,
`Food present` — followed by the separator and four pathway rows, `P0`–`P3`. The four hidden
codings (`docs/testing-attribute-commissioning.md`) are not rows here any more than they're
chips or search fields: this view respects the same hiding as everywhere else.

Open **Codings** in the top bar and commission **Resource stressed**. Watch the fields list
without touching anything else:

- A ninth attribute row appears, **Resource stressed**, in its declared position — right after
  `Food present` and before the `P0`–`P3` separator, the same slot it takes in the correlation
  matrix.
- With nothing searched, its row reads `yes 30%` in *both* the `these` and `all` columns — 240 of
  the 800 conversations.

That it shows up in **both** columns, not just `these`, is the detail worth noticing: the
baseline itself recomputes once a coding is commissioned, because `all` means the whole dataset
*as currently visible* to this reader, and a newly commissioned attribute is now part of that.
Clicking the row opens a detail pane titled **Resource stressed** with two histograms reading
`n = 800 · yes 30% · min 0 · max 1` on both sides — identical, because nothing is searched yet.
Type `resource_stressed:1` and the `these` side narrows to the 240 conversations that have it,
while `all` stays at 800; the two histograms are no longer identical, and the row you just
commissioned behaves exactly like the eight that were visible from the start.

---

## Known rough edges — already known, no need to report

- **A value the dataset never named still shows as a number** on the axis and in the hover text
  (§4). That is the intended fallback, not a gap: a partial label map degrades to the number
  rather than guessing at a name.
- **No count axis on either histogram**, matching Correlations: bar heights are only comparable
  within one histogram, never between the two (§5). The `n = …` text is the only place the true
  magnitude lives.
- **Clicking a bar does not narrow the search.** The detail pane is read-only; there's no
  affordance to turn a bar into a search clause.
- **The selected field is not carried in the URL.** Reloading or sharing a `#view=fields` link
  reopens the list with nothing selected, even if a field's detail pane was open when the link
  was copied.
- **A count of 1 reads as "1 reviews"**, the same pre-existing wrinkle Correlations has.
- **The hover on a histogram bar is mouse-only**, the same limitation the correlations view's bar
  hover has.
- **`Predicted sentiment`/`Predicted answer` is a row here and in the correlation matrix, but
  never a checkbox in the regression panel** (`docs/testing-correlations-view.md`, Known rough
  edges) — that panel is the one surface where this attribute doesn't show up. `target`,
  `prediction`, and `model_correct` mutually determine one another for binary values, so on their
  own they'd just make `prediction` an uninformative predictor, not a reason to remove its
  checkbox outright. The actual reason is historical: during development, checking `prediction`
  alongside `target` and `model_correct` with pairwise interactions on used to drive the design
  matrix exactly singular, and the panel's "not enough usable data" message misdescribed why. That
  failure mode is not something you can reproduce today — there is no `prediction` checkbox left
  to check, so there's nothing to switch on to go looking for it. It's written down here only so
  the missing checkbox doesn't get mistaken for an oversight and "restored."
- **Two search fields can point at the same fact.** `classification_label:positive` (string) and
  `prediction:1` (numeric) both narrow to the same reviews — the string reads better in a query,
  the number is what Correlations and the regression panel need. `review_stars`/`stars` already
  set this precedent, so this isn't new, just easy to miss until you go looking for `prediction`
  in the field directory above and wonder why `classification_label` also works.
