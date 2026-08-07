# Predicted Answer Attribute — Design

## Overview

A new binary attribute, `prediction`, carrying what the model actually said.

The explorer already exposes the ground truth (`target`) and whether the model agreed with it
(`model_correct`), but never the prediction itself. It is recoverable — a reader who knows the
target and knows the model was wrong can work out what it predicted — but nobody should have to.
It is the first thing a person looks for, and every view that correlates or summarises fields is
currently missing the variable those views exist to explain.

The data is already there: `S3Item.classification` is the prediction, and the item panel already
renders it as a badge with its confidence. This spec adds nothing to the data and generates no
dataset. It declares an attribute over a field the app has always had.

See [2026-08-04-attribute-commissioning-design.md](2026-08-04-attribute-commissioning-design.md)
for the attribute-visibility machinery this rides on, and
[2026-08-06-field-stats-view-design.md](2026-08-06-field-stats-view-design.md) for the most recent
surface it reaches.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Mechanism | **An ordinary attribute**, no new concept | `dataset.attributes` is the one list every surface reads. Declaring `prediction` there reaches all six surfaces at once and needs no wiring per view. |
| Redundant chip | **Allowed to appear** | The item panel already shows the prediction as a badge *with confidence*, so the chip says strictly less. Suppressing it would mean a per-surface exclusion — the first crack in the single-list invariant that makes commissioning's "hiding is total" guarantee hold. A duplicated line of text is a smaller cost than an exception to that rule. |
| Position | **Immediately after `target`** | The array order is the matrix's row/column order and the Fields list's order. *Actual, predicted, correct* is the sequence the three variables explain each other in. |
| Labels | **Mirror each dataset's `target`** | `target` is already dataset-specific ("Actual sentiment" / "Actual answer"). A generic wording for `prediction` would break the pairing that makes the two rows read as a matched set. |
| Value labels | **One `const` per dataset**, shared with `classificationLabels` | Both describe the same binary outcome space: the classifier predicts the space the target is drawn from. Written twice they can drift, and the drift is visible — the Fields view's axis would disagree with the item panel's badge. |
| Regression collinearity | **`prediction` is excluded from the regression panel's predictor candidates** | Superseded during implementation; see the Amendment below. The original ruling was "left alone", on the assumption that going singular required a deliberate selection. It does not: every candidate starts checked, so ticking the interactions box alone breaks the panel's default state. |

## Amendment: `prediction` is not a regression predictor

Three passages in this document — the Decisions table's "Regression collinearity" row, the
"What It Reaches" table's regression line, and the closing paragraph of "The regression panel
can go singular" — originally said the collinearity would be left alone and that `prediction`
would become an ordinary predictor candidate. They read, in full:

> | Regression collinearity | **Left alone** | Selecting `target` + `prediction` with
> interactions is exactly singular. The panel already degrades safely. Detecting and explaining
> collinearity is a different feature. |

> | Regression panel | A new predictor candidate |

> That message misdescribes this particular cause — the data is ample; the predictors are
> dependent — but distinguishing a singular design matrix from a sparse one is its own feature.
> **Out of scope here; recorded in the walkthrough's rough edges instead.**

**All three are superseded.** `prediction` is withheld from the regression panel's predictor
candidates on both datasets. It remains a full attribute on every other surface.

**Why the original reasoning was wrong.** It assumed reaching the singular case took a
deliberate act: a user selecting `target` *and* `prediction` *and* interactions. It does not.
`regression-panel.tsx` initialises `excludedKeys` to an empty set, so **every candidate starts
checked**. Adding `prediction` therefore meant that a user who ticked "include pairwise
interactions" and did nothing else got "Not enough usable data to fit a model" where they
previously got a fit — `model_correct` is an exact affine function of
`{1, target, prediction, target × prediction}`, and `buildDesignMatrix`'s duplicate-column check
is pairwise only, so nothing catches a three-column dependency. The defect was in the panel's
default state, not in an exotic corner of it, and "the panel already degrades safely" is not
true of a message that misdescribes its own cause on first use.

**Why exclusion rather than a better error.** The three are mutually determining, so
`prediction` carries no explanatory power a regression on the other two does not already have.
There is nothing to lose by withholding it and a working default state to gain. Detecting and
explaining collinearity properly remains out of scope (it is still listed there below).

**How it is enforced.** By data, not by a key literal: `AttributeDefinition` gains an
`excludeFromRegression?: boolean` flag (`src/shared/types/attributes.ts`, beside `hidden`),
both `prediction` declarations set it, and the panel's candidate filter tests the flag. The
flag's docblock carries the full rationale, so a reader who finds the missing checkbox
suspicious meets the explanation at the point of definition. Each dataset's test asserts its
`prediction` sets the flag; the panel's test opts out via the flag rather than by name; and a
`buildSeries` test pins that the flag survives onto the `Series` the panel reads.

**What it cost the walkthroughs.** `prediction` appearing everywhere *except* the regression
panel looks like a bug, so it is documented as a known rough edge in
[testing-fields-view.md](../../testing-fields-view.md) (the canonical copy) with pointers from
[testing-correlations-view.md](../../testing-correlations-view.md),
[testing-alien-explorer.md](../../testing-alien-explorer.md) §4, and
[testing-attribute-commissioning.md](../../testing-attribute-commissioning.md) §2.5.

## The Attribute

Derived in each dataset's `getAttributeValue` as `item.classification ?? null` — null when the
item has no prediction, matching how `model_correct` already returns null when either side is
missing.

Yelp:

```ts
{
  key: "prediction",
  label: "Predicted sentiment",
  description: "The sentiment the model predicted for this review: 1 for positive, 0 for "
    + "negative. Only defined for reviews the model has scored.",
  type: "binary",
  valueLabels: CLASSIFICATION_LABELS,
}
```

Alien:

```ts
{
  key: "prediction",
  label: "Predicted answer",
  description: "What the model predicted for this conversation: 1 for approach, 0 for wait. "
    + "Only defined for conversations the model has scored.",
  type: "binary",
  valueLabels: CLASSIFICATION_LABELS,
}
```

The labels pair with each dataset's existing `target`:

| | `target` | `prediction` | Values |
|---|---|---|---|
| Yelp | Actual sentiment | **Predicted sentiment** | negative / positive |
| Alien | Actual answer | **Predicted answer** | wait / approach |

**The alien case needs an explicit `switch` arm.** Its `getAttributeValue` ends in
`default: return item.attributes?.[key] ?? null`, which reads the generated per-item attribute
bag. `prediction` is derived, not generated, so without its own arm it would silently resolve to
null for every conversation rather than failing visibly.

### Sharing the label constant

Each config currently writes its label pair twice — as `target.valueLabels` and as
`config.classificationLabels`. `prediction` would make three. Hoist one `const` per dataset file
and use it in all three places.

Yelp's `target.valueLabels` carries a comment noting it matches the `target_label` string in the
S3 data. That stays true: the label space is shared, which is the point. Update the comment to say
the three agree because the classifier predicts the space the target is drawn from, rather than
deleting the provenance note.

### Key collision

Adding `prediction` to the alien dataset's derived attributes means a generated dataset that
declared its own `prediction` now fails loudly in `validateAttributeKeys` instead of shadowing
this one. That is the designed behaviour, not a regression — the same guard already protects
`target` and `model_correct`.

`prediction` does not go in `RESERVED_FIELD_NAMES`. That list names search fields which are *not*
attributes; the duplicate check already covers this case.

## What It Reaches

Five of the six surfaces the attribute list feeds, with no per-surface work — the regression
panel is the single exception, per the Amendment above:

| Surface | Result |
|---|---|
| Attribute chips | A chip beside the existing badge. Redundant, and accepted — see Decisions. |
| Search fields | `prediction:1` |
| Search help dialog | A row with the description |
| Correlation matrix | A new row and column |
| Regression panel | **Nothing** — a target you can pick, but never a predictor candidate. The one exception, ruled during implementation; see the Amendment. |
| Fields view | A new row, with its own distribution |

### The matrix gains nothing degenerate

`target × prediction` is essentially the model's accuracy. `prediction × model_correct` shows which
class the model errs toward. Both are real findings, and neither is a constant or a perfect
correlation.

### The regression panel would go singular — so `prediction` is kept out of it

For binary values, `correct = 1 − target − prediction + 2·target·prediction`. With main effects
only there is no exact collinearity, but the panel offers interaction terms, and with them selected
the three are exactly dependent.

The failure is safe in the narrow sense: `invertSymmetric` returns null below its pivot tolerance,
`solveSymmetric` propagates it, and the panel renders "Not enough usable data to fit a model.
Include more attributes, widen the search, or pick a different target."

That message misdescribes this particular cause — the data is ample; the predictors are dependent.
Distinguishing a singular design matrix from a sparse one is its own feature and stays out of
scope. **What is not acceptable is meeting that message in the panel's default state**, which is
what happens when `prediction` is a candidate, because every candidate starts checked. So
`prediction` is excluded from the candidate list, via `excludeFromRegression` on the attribute
definition. See the Amendment above for the full ruling, and the flag's docblock in
`src/shared/types/attributes.ts` for the version a future reader will find first.

### Two ways to search the same thing

`flattenItem` already writes `classification_label` (a string, e.g. `positive`). Adding
`prediction` (numeric, 0 or 1) gives a second route to the same fact. This is deliberate: the
string reads better in a query, and the number is what the correlation and regression views
require. `review_stars` and `stars` already set this precedent — attributes that alias existing
search fields, documented in `RESERVED_FIELD_NAMES`.

## Testing

`yelp-dataset.test.ts` and `alien-dataset.test.ts` both pin the exact attribute key list, so both
gain the new key. That is a required update, not a weakened assertion — the lists exist to catch
exactly this kind of change going in unnoticed.

New derivation cases per dataset: the prediction returns 0 and 1 as classified, and returns null
when `classification` is absent. For the alien dataset specifically, **assert that `prediction`
does not fall through to the generated attribute bag** — that is the failure mode its `switch`
arm exists to prevent, and it would otherwise pass silently as null.

One test pins the label constant: a dataset's `prediction.valueLabels` and its
`config.classificationLabels` are the same object. That is what stops the Fields view's axis from
drifting away from the item panel's badge.

Per the Amendment, three more tests bind the regression exclusion to the data rather than to a
key literal: each dataset asserts its `prediction` sets `excludeFromRegression` (and that `target`
and `model_correct` do not), `regression-panel.test.tsx` builds its excluded fixture by setting
the flag instead of by naming it, and `build-series.test.ts` pins that the flag reaches the
`Series` the panel actually reads.

## Walkthroughs

**Amended — this section originally named only two documents, and that was a spec defect.** Four
walkthroughs quote attribute counts, matrix dimensions, ordinals, or field lists that this change
alters, and two of them state those counts as literal bug-report criteria, so a stale count makes
a tester file a false report:

- [testing-correlations-view.md](../../testing-correlations-view.md) — matrix dimensions, the
  partial-coverage dot, rough edges.
- [testing-fields-view.md](../../testing-fields-view.md) — the field directory, rough edges.
- [testing-attribute-commissioning.md](../../testing-attribute-commissioning.md) — chip counts,
  search-help entry counts, matrix row counts, the ordinal each commissioned attribute lands on,
  Yelp's attribute list, and `P3`'s matrix row in the §7 discovery path.
- [testing-alien-explorer.md](../../testing-alien-explorer.md) — chip count and order, the
  search-help attribute list, the `Model was correct` row, the regression's predictor count,
  and Yelp's attribute list.

All numbers taken from the running app, not from arithmetic. Every one of the 800 alien
conversations carries a `classification`, so all 800 gain a `Predicted answer` chip; the first
Yelp review has none, so it gains no chip — that asymmetry is what makes copying counts between
the two datasets unsafe.

The Fields view walkthrough carries the canonical rough-edges note explaining why `prediction`
has no regression checkbox, with pointers to it from the other three.

## Out of Scope

- Detecting collinearity in the regression panel, or improving the message it shows.
- Exposing `classification_probability` as an attribute. It is continuous, already visible on the
  item badge, and nothing here needs it.
- Removing or changing the item panel's classification badge.
- Any per-surface visibility mechanism.
- Any change to the alien generator or to either dataset's data.
