# Pathway Prediction with Target-Fitted Importance

[NPW-16](https://concord-consortium.atlassian.net/browse/NPW-16) added a **pathway
prediction** — what an item's pathways say on their own, independent of the model —
and made the disagreement between that and the model's own prediction searchable.
This note records the analysis behind that story: does the disagreement happen where
the pathways reconstruct the item poorly?

See
[`docs/superpowers/specs/2026-09-11-pathway-prediction-design.md`](superpowers/specs/2026-09-11-pathway-prediction-design.md)
for the full design, including the Appendix this note's §3 draws from.

## How this note differs from `pathway-prediction-analysis.md`

A pathway prediction is `Σ scoreᵢ × importanceᵢ`, so every result involving it
depends on which `pathway_importance` is used. There are two candidates, and they
answer different questions:

| | This note | [`pathway-prediction-analysis.md`](pathway-prediction-analysis.md) |
|---|---|---|
| Importance fitted against | the **true sentiment** (`target`) | the **model's prediction** (`classification`) |
| In ML terms | a *probe*: what the pathways can tell you about the task | a *surrogate*: what the model's output tracks |
| Fitted on | the train split, by the NNmaker pipeline | the test split, the only split with predictions |
| Source | the published yelp `pathway_importance` | refit for that note, in-sample |
| Used by the explorer today | **yes**, on yelp | not yet ([NPW-20](https://concord-consortium.atlassian.net/browse/NPW-20)) |

Everything in this note uses the published, target-fitted importance, because that is
what NPW-16 shipped. The two notes reach different conclusions on most questions: how
often the pathways disagree with the model, whether the minor pathways help or hurt,
and how importance relates to the classifier head. Those differences come from the
importance, chiefly from what it was fitted against, though the split differs too.

One result does not involve importance at all and is identical in both notes: how the
reconstruction residual relates to the magnitude of the pathway scores (§6, "What that
underlying condition actually is").

The companion note exists because there is a good case that importance should be
fitted against the model's prediction if it is meant to explain the model. The last
row of the table in §3 below is that variant; the companion note works through it in
full.

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
| Raw `Σ p·imp ≥ 0` (**shipped**) | 98.2–98.5% | 46–54 |
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

Verbatim output of `npm run analyze:pathway-prediction`, run against the published
yelp index on 2026-09-11. Re-run the script to reproduce these numbers.

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

**Conclusion**: the association between reconstruction error and disagreement does not
survive controlling for distance from the decision boundary. This is observational, so
it does not establish that reconstruction error cannot cause disagreement; what it
rules out is the unconditional association the story's hypothesis rested on. The
condition that accounts for both is described below.

### What that underlying condition actually is

An earlier version of this note said the reason was that "P0 carries around 85% of
the variance, so a review with little P0 signal has little for the pathways to
rebuild". That was an interpretation, never a measurement, and measuring it shows it
is wrong in an interesting way. Reconstruction works from raw scores times loadings,
so the quantity to test is score magnitude:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| corr(residual, \|P0 score\|) | -0.670 | -0.643 | -0.649 |
| corr(residual, ‖other scores‖) | +0.738 | +0.734 | +0.725 |
| partial(residual, \|P0\| \| others) | -0.094 | -0.269 | -0.360 |
| partial(residual, others \| \|P0\|) | +0.427 | +0.520 | +0.535 |

Badly reconstructed reviews are not ones where the pathways are quiet. They are ones
where the **minor pathways are loud**, and that association is the stronger of the
two: control for the other pathways' magnitude and P0's own correlation with the
residual largely collapses (to -0.09 on `train-fa-6`). The minor factors absorb
whatever is idiosyncratic about a review, and idiosyncratic reviews reconstruct
poorly.

So the corrected statement of the condition is: a review whose activations are
unusual expresses itself through the minor pathways rather than P0. That review sits
near the pathway decision boundary (because P0 is what the boundary is made of) and
reconstructs badly (because the minor pathways are carrying the load) — the same
cause for both, which is why controlling for distance flattens the correlation.

### P0 decides; the minor pathways mostly add noise

Weak-P0 reviews are rare. Only about 1% of scored reviews have a P0 contribution
below 1 in log-odds (29, 28 and 26 reviews across the three fits), and about 3.3%
below 3 (98, 102, 99). Almost every disagreement lives there: 52 of 54, 47 of 48 and
45 of 46. Those reviews reconstruct far worse than average — mean residual 0.31, 0.27
and 0.31 against overall means of 0.11, 0.09 and 0.10.

Against the model's own prediction, the split between P0 and everything else is
extreme:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| corr(P0 contribution, classification) | +0.987 | +0.986 | +0.986 |
| corr(non-P0 sum, classification) | -0.181 | -0.061 | -0.070 |

The other pathways, weighted by their own fitted importance, carry no useful signal
about what the model predicted — slightly negative, if anything. And when P0 is weak
they do not step in to decide the case correctly; in the `|P0 contribution| < 1`
band their sign matches the model on 0–4% of reviews.

Decomposing the disagreements shows they are not merely passengers:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| total disagreements | 54 | 48 | 46 |
| P0 alone already disagreed | 27 | 29 | 29 |
| minor pathways flipped a correct P0 into a disagreement | 27 | 19 | 17 |

Roughly half of all disagreements are manufactured by the minor pathways overriding a
P0 that had already matched the model. That is why P0 alone agrees with the model
more often than the full weighted sum does (§3).

### Does importance follow connectivity or variance?

A pathway is a pattern in activations. Factor analysis never sees a weight, so
whether a pathway influences the classification depends on whether the neurons it
spans feed the classifier head — a fact about how the model was trained, not about
the factor. `pathway_importance` does not measure that. The importance used in this
note is a logistic regression of the **true sentiment** onto pathway scores, fitted
after the fact, so it records statistical association with the label and nothing
structural — and an association with the label is a step further from the model's
output than an association with the prediction would be.

[`pathway-prediction-analysis.md`](pathway-prediction-analysis.md) runs this same
test against importance fitted to the model's prediction, where the association with
the final layer comes out stronger.

The activation vector allows a crude test, because it is not homogeneous: neurons
0–767 are the CLS embedding and 768–779 are the two classifier-head layers. If
influence followed connectivity, importance should track how much of a pathway's
loading mass sits on those 12 neurons. Uniform mass would be 1.54%.

| Fit / pathway | \|importance\| | explained variance | classifier-head mass | final-layer mass |
|---|---|---|---|---|
| train-fa-6 P0 | 5.548 | 0.855 | 1.69% | 0.89% |
| test-fa-7 P0 | 5.455 | 0.819 | 1.73% | 0.92% |
| dev-fa-6 P0 | 5.460 | 0.810 | 1.74% | 0.93% |
| dev-fa-6 P2 | 0.298 | 0.013 | **2.27%** | 0.08% |
| test-fa-7 P2 | 0.338 | 0.008 | 1.70% | 0.02% |
| test-fa-7 P3 | 0.695 | 0.008 | 0.14% | 0.02% |

Pooled across all 19 pathways in the three fits, importance ranks correlate 0.218
with classifier-head mass, 0.304 with final-layer mass, and 0.502 with explained
variance.

Two things follow. P0 is genuinely distinguished on the measure closest to the
output — its final-layer mass (0.89–0.93%) is roughly triple the next highest and an
order of magnitude above most — which is consistent with connectivity mattering. But
the relationship does not generalise: `dev-fa-6 P2` has the largest classifier-head
mass of any pathway in any fit and about one-eighteenth of P0's importance, and
`test-fa-7 P2` sits at essentially P0's head mass with one-sixteenth of its
importance. A pathway can occupy the classifier head as much as the dominant pathway
does and still barely move the prediction.

The practical consequence for reading pathways: of the 19 pathways here, exactly one
per fit carries the association with the model's output, and the other 16 carry
approximately none. "Pathways correlate with what the model predicts" is a statement
about P0, not about pathways. Whether any given pathway influences the classification
is an empirical question about a particular trained model, and a pathway that
captures real structure in the activations while having no bearing on the output is
a normal outcome, not a pathology. That is worth keeping in mind before treating a
pathway's score as an explanation of a prediction.

**Provenance of this subsection.** Unlike §5, these figures come from a one-time
probe rather than from `npm run analyze:pathway-prediction`, which does not compute
them. Each is reproducible from the published index: the correlations use the same
`pearson` the script uses, over scored reviews with a reconstruction R² for the fit;
"P0 contribution" is `pathway_scores[0] × pathway_importance[0]`; loading mass is the
share of a pathway's summed squared loadings falling on neurons 768–779, using the
`loadings` array in each fit's metadata.

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
