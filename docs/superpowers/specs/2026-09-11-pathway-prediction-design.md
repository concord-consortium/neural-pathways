# Pathway Prediction — Design

## Overview

Give every item a **pathway prediction**: what the pathways on their own say, computed from the
item's pathway scores and the selected fit's `pathway_importance`. Make it searchable, make the
disagreement with the model searchable, show it per item in the pathway panel, and write down
whether that disagreement is explained by reconstruction error.

Jira: [NPW-16](https://concord-consortium.atlassian.net/browse/NPW-16).

The data is already there. `pathway_importance` lives per fit in `metadata.fa_fits[fit]` and is
currently read only for display (`pathway-panel.tsx`, `pathway-bar.tsx`). Nothing today combines it
with an item's pathway scores.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Formula | **The raw sum `Σ scoreᵢ × importanceᵢ`**, no intercept, no re-standardizing | The corrected variants agree with it on ≥99.7% of yelp test reviews, and the intercept that would go with the published coefficients cannot be recovered from the published data. See Appendix. |
| Threshold | **`sum ≥ 0` is class 1** | Matches `logisticRegression` in `src/explorer/utils/regression.ts`, which classifies on `eta >= 0`. |
| Surfaces | **Search fields only**, plus one display in the pathway panel | These are fit-dependent values, like `pathway_n` and `reconstruction_r2`. Attributes have no notion of a fit — `getAttributeValue(item, key)` cannot see one — so making these attributes would mean threading the fit through the attribute layer for no gain this story needs. |
| Where the formula lives | **A pure module, `src/explorer/utils/pathway-prediction.ts`** | Both `flattenItem` and the analysis script import it, so the analysis measures the formula that ships. `scripts/alien/emit.ts` already imports `src/explorer/utils/regression`, so the direction is established. |
| Display | **A footer in the pathway panel** | The panel already shows an Importance column per pathway; the pathway prediction is the total of those rows times the scores beside them, so the footer sits where its own arithmetic is visible. |
| Analysis | **A committed script plus a note in `docs/`** | The story asks for a script or test, not UI. A script that imports the shipped formula stays honest as the formula changes; a jest test would need a multi-MB fixture and would assert research numbers. |

## The Formula

`src/explorer/utils/pathway-prediction.ts`:

```ts
export function pathwayPrediction(
  scores: number[],
  importance: number[] | undefined,
): number | null
```

Returns `Σ scoresᵢ × importanceᵢ`, or null when `importance` is undefined, empty, or a different
length from `scores`. The length check is what stops a partial or older index from producing a
confident-looking number from mismatched arrays — the app's own test fixture carries
`pathway_importance: []`.

A second export turns the sum into a class, so the threshold is written once:

```ts
export function pathwayPredictionClass(sum: number): number   // sum >= 0 ? 1 : 0
```

### Why no intercept and no standardization

`pathway_importance` is a logistic regression coefficient per pathway — signed log-odds per
standard deviation. So the plain sum is log-odds **without an intercept**, and thresholding it at 0
is not exactly the model's decision boundary. Three things justify ignoring that:

1. On the yelp test split, the raw sum, the sum over re-standardized scores, and that sum plus the
   recovered intercept agree with each other on at least 99.7% of reviews. The differences are a
   handful of items per fit.
2. Neither the intercept nor the standardization that goes with the published coefficients is in
   the published data, and they cannot be recovered from it (Appendix).
3. A version refit directly against the model's predictions agrees with the model 99.9% of the
   time, which would leave 1–2 disagreeing reviews. That is a worse story field, not a better one:
   the disagreement search would find nothing to look at.

## Search Fields

`flattenItem` gains a fourth parameter, the selected fit's `pathway_importance`. `app.tsx` reads it
from `indexData.metadata.fa_fits[selectedFitName]` inside the existing `flatItems` memo, whose
dependencies (`indexData`, `selectedFitName`) already determine it.

| Field | Type | Value | Present when |
|---|---|---|---|
| `pathway_prediction` | number | the raw weighted sum | the formula returns a value |
| `pathway_prediction_label` | string | `classificationLabels[class]` — positive/negative, approach/wait | same |
| `pathway_prediction_matches` | boolean | whether the class equals `item.classification` | there is a prediction **and** the item has a `classification` |

Example queries:

```
pathway_prediction:<0
pathway_prediction_label:negative
pathway_prediction_matches:false
pathway_prediction_matches:false AND pathway_prediction:[-1 TO 1]
```

The three names join `RESERVED_FIELD_NAMES` in `dataset-config.ts`, so an attribute key cannot
shadow them. They also get rows in the shared Fields table in `search-input.tsx`, beside
`classification_label`, which means both datasets pick them up with no per-dataset work.

`pathway_prediction_matches` is deliberately absent — not false — for an item with no
`classification`. Most yelp reviews are in that position, since only the test split was scored, and
a `false` there would read as "the pathways disagree with the model" when the model never spoke.

### Expected sizes

About 46–54 disagreeing reviews per fit on the yelp test split, and 46 (four pathways) and 55
(three pathways) on the alien datasets. That is the point of the field: a set small enough to read
through.

## The Pathway Panel Footer

`PathwayPanel` gains two props: the item's `classification` and the dataset's
`classificationLabels`. It computes the sum from props it already has (`scores`,
`pathwayImportance`) and renders below the last bar:

```
Pathway prediction  +9.98 → positive
Model said positive — agrees
```

- The sum uses `toFixed(2)`, matching the importance column, with an explicit sign.
- The class name comes from `classificationLabels`, so the alien datasets read "approach"/"wait".
- When the fit has no importance, there is no footer.
- When the item has no `classification`, the first line renders and the second does not.

No walkthrough currently describes the pathway panel, so none needs updating for this.

## The Analysis

**`scripts/analysis/disagreement.ts`** holds the pure part. Given the items, a fit name, and that
fit's importance, it considers only items with a `classification` (on yelp, the 2,998 test reviews)
and returns:

- agreement with the model, the number of disagreeing items, and the same for P0 alone;
- `pearson` between disagreement (1/0) and the residual, `1 − reconstruction_r2`;
- mean reconstruction R² for agreeing and disagreeing items, and the disagreement rate within each
  fifth of the residual range;
- the correlation between the size of the pathway sum (distance from the decision boundary) and the
  residual, and the disagreement-residual correlation with that distance controlled for;
- `logisticRegression` coefficients for disagreement from distance and residual together.

It gets the prediction from `pathway-prediction.ts` and the statistics from the app's `pearson` and
`logisticRegression`, so the analysis cannot drift from the shipped formula.

**`scripts/analysis/pathway-prediction-residual.ts`** is the entry point: it loads the yelp index
with `fetchIndex(yelpDataset)`, runs the analysis for each fit, and prints a table per fit. It runs
under `ts-node --project tsconfig.generator.json`, exposed as `npm run analyze:pathway-prediction`.

**`docs/pathway-prediction-target-analysis.md`** records:

1. the question and the story's hypothesis;
2. the formula decision, with the comparison table from the Appendix, labelled as a one-time
   investigation rather than something the script reproduces;
3. the script's output per fit;
4. the interpretation — the raw correlation is real but comes from distance to the decision
   boundary, and with distance controlled for there is nothing left;
5. caveats — yelp test split only, two reviews corrupted by NPW-19, the train split unusable until
   NPW-19 is fixed, and the alien datasets excluded because their numbers are invented;
6. how to rerun it.

## Testing

**`pathway-prediction.test.ts`** — the sum; null for missing, empty, and wrong-length importance;
exactly 0 classifies as 1.

**`flatten-item.test.ts`** — labels come from the dataset; the fields follow the selected fit (the
existing `fit_a`/`fit_b` pattern); `matches` is true, false, and absent-without-classification; all
three fields absent when the importance is missing or the wrong length.

**`dataset-config.test.ts`** — the three names are reserved, and an attribute using one is rejected.

**`search-input.test.tsx`** — the three help rows render, beside the existing `classification_label`
assertions.

**`pathway-panel.test.tsx`** — the footer shows the total and its class; says agrees and disagrees;
no footer without importance; no "Model said" line without a classification; the dataset's labels
are used.

**`disagreement.test.ts`** — hand-built data where disagreement tracks distance from the boundary,
the residual tracks distance, and nothing else ties them together: the controlled correlation comes
out near zero while the raw one does not.

Check during implementation whether `playwright/workspace.test.ts` (which opens the Search help
dialog) asserts the field list.

## Walkthroughs

`docs/testing-alien-explorer.md` is the only walkthrough quoting the search-help field list:

- **§3**, lines 104–106: add the three fields.
- **§3**: a step searching `pathway_prediction_matches:false`, with the count from the running app.
- **§6**: the same search on the three-pathway dataset.

Counts come from the running app, not from arithmetic. The yelp count belongs in
`docs/pathway-prediction-target-analysis.md` rather than a walkthrough, because it varies by fit and is
affected by NPW-19.

`docs/testing-attribute-commissioning.md` counts attributes, not fields, and does not change.

## Out of Scope

- Attributes, chips, the correlation matrix, the Fields view, and the regression panel. Recorded as
  a possible follow-up: it needs the selected fit threaded through the attribute layer.
- An intercept or per-fit standardization of pathway scores.
- Any change to the data, the alien generator, or the heatmap app.
- Fixing the scrambled train split — that is NPW-19.
- Showing the pathway prediction in the item panel or on result cards.

## Appendix: What the Spike Found

Measured on the 2,998 scored yelp test reviews, against all three fits. The scripts were throwaway;
these numbers are recorded here because they are the evidence for the formula decision, and the
committed script does not reproduce all of them.

### Formula comparison

| Formula | Agrees with the model | Disagreeing items |
|---|---|---|
| Raw `Σ p·imp ≥ 0` (**shipped**) | 98.2–98.5% | 46–54 |
| Re-standardized scores, with or without the recovered intercept | 98.2–98.5% | 46–53 |
| P0 alone | 99.0–99.1% | 27–29 |
| Refit directly against `classification` | 99.9% | 1–2 |

The first three agree with each other on at least 99.7% of reviews. The pathway prediction matches
the true sentiment slightly more often than the model does (95.7% against 95.2%), and about
two-thirds of the disagreements are reviews the model got wrong.

### Why the stored coefficients cannot be reproduced

Fitting the published train-split scores against their labels gives coefficients near zero, because
the train rows in `index.json` are scrambled: their pathway data belongs to other reviews. That is
NPW-19. The coefficients themselves are sound — the pipeline fit them on data that was consistent
at the time — but nothing in the published data lets us recover the intercept or the standardization
that accompanied them.

### Disagreement against the reconstruction residual

The story's hypothesis was that pathway/model disagreement happens where reconstruction error is
high. The raw numbers appear to support it: the correlation between disagreement and residual is
0.30–0.35, and nearly every disagreement falls in the worst-reconstructed fifth of reviews (about
8% there against roughly 0% elsewhere; mean R² 0.70 against 0.90).

It does not survive a control. The size of the pathway sum correlates −0.77 with the residual: a
review with a small sum sits near the decision boundary *and* reconstructs poorly. Controlling for
that distance, the disagreement-residual correlation falls to between −0.03 and 0.02, and in a
logistic model the residual's coefficient is near zero while distance dominates. 53 of 54
disagreements sit in the 10% of reviews closest to the boundary.

So the answer to the story's question is that the correlation is real but accounted for: once
distance from the decision boundary is controlled for, no association between reconstruction error
and disagreement remains. This is observational, so it does not establish that reconstruction error
cannot cause disagreement; what it rules out is the unconditional association the hypothesis rested
on.

**Amendment — the mechanism stated here was wrong.** This passage originally explained the shared
cause as "P0 carries about 85% of the variance, so a review with little P0 has little for the
pathways to rebuild". That was never measured, and measuring it refutes it: the residual correlates
**+0.73** with the magnitude of the *other* pathways' scores against −0.65 with P0's, and
controlling for the other pathways collapses P0's own correlation to −0.09 on `train-fa-6`. Badly
reconstructed reviews are ones where the minor pathways are loud, not ones where the pathways are
quiet. The correct account, along with the decomposition of which pathways produce the
disagreements and evidence on whether importance tracks connectivity to the classifier head, is in
[docs/pathway-prediction-target-analysis.md](../../pathway-prediction-target-analysis.md) §6.
