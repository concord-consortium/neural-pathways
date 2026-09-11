# Pathway Prediction: Does Disagreement Track Reconstruction Error?

[NPW-16](https://concord-consortium.atlassian.net/browse/NPW-16) added a **pathway
prediction** — what an item's pathways say on their own, independent of the model —
and made the disagreement between that and the model's own prediction searchable.
This note records the analysis behind that story: does the disagreement happen where
the pathways reconstruct the item poorly?

See
[`docs/superpowers/specs/2026-09-11-pathway-prediction-design.md`](superpowers/specs/2026-09-11-pathway-prediction-design.md)
for the full design, including the Appendix this note's §3 draws from.

## 1. Question

The story's hypothesis: when the pathway prediction disagrees with the model's own
prediction, that disagreement is explained by reconstruction error — the pathways
rebuild the item poorly, so their own read on it is unreliable.

The answer this analysis found is **no**. The raw correlation between disagreement
and reconstruction error is real, but it disappears once you control for how close
the item sits to the pathways' decision boundary. See §6.

## 2. What the pathway prediction is

`src/explorer/utils/pathway-prediction.ts` computes, for an item and a fit:

```
pathway_prediction = Σ scoreᵢ × importanceᵢ
```

— each pathway score times that pathway's `pathway_importance` in the selected fit,
summed. `pathway_importance` is a per-pathway logistic regression coefficient
(signed log-odds per standard deviation), so this sum is log-odds **without an
intercept**. The threshold is `sum ≥ 0` is class 1, matching `logisticRegression`'s
`eta >= 0` rule (`src/explorer/utils/regression.ts`). There is no re-standardization
of the scores and no recovered intercept — see §3 for why.

## 3. Why this formula

This is a one-time investigation from the design spike, not something the committed
analysis script reproduces. Numbers below are taken verbatim from the Appendix of
`docs/superpowers/specs/2026-09-11-pathway-prediction-design.md`, measured on the
2,998 scored yelp test reviews against all three fits:

| Formula | Agrees with the model | Disagreeing items |
|---|---|---|
| Raw `Σ p·imp > 0` (**shipped**) | 98.2–98.5% | 46–54 |
| Re-standardized scores, with or without the recovered intercept | 98.2–98.5% | 46–53 |
| P0 alone | 99.0–99.1% | 27–29 |
| Refit directly against `classification` | 99.9% | 1–2 |

The first three agree with each other on at least 99.7% of reviews, so the choice
between them barely matters in practice. The last row would leave too few
disagreements to search — 1–2 items is not a story field.

The intercept that accompanied the published `pathway_importance` coefficients
cannot be recovered from the published data: fitting the train-split scores against
their labels gives coefficients near zero, because the train rows in `index.json`
are scrambled (their pathway data belongs to other reviews — that is NPW-19). The
coefficients themselves are sound; the pipeline fit them on data that was consistent
at the time. There is just nothing left in the published data to recover the
intercept or the standardization that went with them.

## 4. Method

`npm run analyze:pathway-prediction` runs `scripts/analysis/pathway-prediction-residual.ts`,
which loads the published yelp index (`fetchIndex(yelpDataset)`) and runs
`scripts/analysis/disagreement.ts` for each of the three FA fits (`train-fa-6`,
`test-fa-7`, `dev-fa-6`).

Only items with both a `classification` (the model's prediction) and a
`reconstruction_r2` for that fit take part — on yelp, that is the 2,998 test-split
reviews that were actually scored. For each such item, the script computes the
pathway prediction from the shipped `pathway-prediction.ts` module, so the analysis
measures exactly the formula that ships, not a reimplementation of it. It reports:

- agreement with the model and the number of disagreeing items, and the same using
  P0 alone;
- the correlation (`pearson`) between disagreement (1/0) and the reconstruction
  residual (`1 − reconstruction_r2`);
- mean reconstruction R² for agreeing vs. disagreeing items, and the disagreement
  rate within each fifth of the residual range;
- the correlation between `|pathway sum|` (distance from the decision boundary) and
  the residual, and the disagreement/residual correlation with that distance
  partialled out;
- `logisticRegression` coefficients for disagreement from distance and residual
  together.

## 5. Results

Verbatim output of `npm run analyze:pathway-prediction`, captured in
`.superpowers/sdd/2026-09-11-pathway-prediction/task-5-report.md`:

### `train-fa-6` (FA fit on train)

| Metric | Value |
|---|---|
| items analysed | 2998 |
| agrees with the model | 98.20% (54 disagree) |
| pathway 0 alone would disagree on | 27 |
| corr(disagree, residual) | 0.340 |
| corr(disagree, \|pathway sum\|) | -0.426 |
| corr(\|pathway sum\|, residual) | -0.771 |
| partial corr(disagree, residual \| \|pathway sum\|) | 0.020 |
| mean reconstruction R² | agree 0.8971, disagree 0.6957 |
| disagreement rate by residual quintile (low→high) | 0.17% 0.00% 0.00% 0.00% 8.83% |
| logistic disagree ~ \|pathway sum\| + residual | margin -2.24, residual -0.09 |

### `test-fa-7` (FA fit on test)

| Metric | Value |
|---|---|
| items analysed | 2998 |
| agrees with the model | 98.40% (48 disagree) |
| pathway 0 alone would disagree on | 29 |
| corr(disagree, residual) | 0.300 |
| corr(disagree, \|pathway sum\|) | -0.414 |
| corr(\|pathway sum\|, residual) | -0.768 |
| partial corr(disagree, residual \| \|pathway sum\|) | -0.031 |
| mean reconstruction R² | agree 0.9128, disagree 0.7490 |
| disagreement rate by residual quintile (low→high) | 0.17% 0.00% 0.00% 0.17% 7.67% |
| logistic disagree ~ \|pathway sum\| + residual | margin -2.21, residual -0.21 |

### `dev-fa-6` (FA fit on dev)

| Metric | Value |
|---|---|
| items analysed | 2998 |
| agrees with the model | 98.47% (46 disagree) |
| pathway 0 alone would disagree on | 29 |
| corr(disagree, residual) | 0.331 |
| corr(disagree, \|pathway sum\|) | -0.436 |
| corr(\|pathway sum\|, residual) | -0.768 |
| partial corr(disagree, residual \| \|pathway sum\|) | -0.007 |
| mean reconstruction R² | agree 0.9062, disagree 0.7030 |
| disagreement rate by residual quintile (low→high) | 0.17% 0.00% 0.00% 0.00% 7.50% |
| logistic disagree ~ \|pathway sum\| + residual | margin -1.56, residual 0.07 |

Rerun it yourself with:

```bash
npm run analyze:pathway-prediction
```

It fetches the published yelp index over the network (~8MB) and takes a few seconds.

## 6. Interpretation

Across all three fits, the raw correlation between disagreement and reconstruction
error is real: `corr(disagree, residual)` is about 0.3–0.34, and disagreements
concentrate almost entirely in the worst-reconstructed fifth of reviews (the top
residual quintile runs 7.5–8.8% disagreement against roughly 0% everywhere else).

But `|pathway sum|` — how far an item sits from the pathways' own decision boundary —
correlates strongly with the residual too, about -0.77 in every fit: a review with a
small pathway sum sits near the boundary *and* reconstructs poorly. Controlling for
that distance, the disagreement/residual correlation collapses to essentially zero
(0.020, -0.031, -0.007 across the three fits). The logistic fit tells the same
story: the residual's coefficient stays small (-0.09, -0.21, 0.07) while the margin
term dominates.

The underlying reason is that P0 carries around 85% of the variance in these fits, so
a review with little P0 signal has little for the pathways to rebuild — it both sits
near the boundary and reconstructs badly, for the same reason, not because one
causes the other.

**Conclusion**: poor reconstruction does not cause the pathway/model disagreement.
Both the disagreement and the poor reconstruction follow from the same underlying
condition — the pathways barely registering the review in the first place.

## 7. Caveats

- **Yelp test split only.** The analysis only considers the 2,998 yelp reviews that
  were actually scored by the model (the test split). The train split is not used.
- **Two reviews carry wrong data.** Two reviews in the published index have data
  quality problems tracked in NPW-19; this analysis was not adjusted for them.
- **The train split is unusable for recovering the intercept or coefficients** until
  NPW-19 (the scrambled train-row bug) is fixed — see §3.
- **The alien datasets are excluded from this analysis.** Their reconstruction and
  classification numbers are generator-invented, not learned from real data, so a
  correlation between disagreement and reconstruction error there would not mean
  anything. The alien datasets do get the same `pathway_prediction*` search fields
  (see `docs/testing-alien-explorer.md`), but this note's correlation analysis is
  yelp-only.
