# Pathway Prediction with Classification-Fitted Importance

This note reruns the pathway prediction analysis from
[`pathway-prediction-target-analysis.md`](pathway-prediction-target-analysis.md) with
one change: the `pathway_importance` behind the prediction is fitted against **the
model's own prediction** rather than the true sentiment. Almost every conclusion
changes as a result.

The explorer does **not** use this importance on yelp yet. Adding it is
[NPW-20](https://concord-consortium.atlassian.net/browse/NPW-20). Until then, the yelp
search fields and pathway panel footer added in
[NPW-16](https://concord-consortium.atlassian.net/browse/NPW-16) use the target-fitted
importance that the other note analyses.

## How this note differs from `pathway-prediction-target-analysis.md`

A pathway prediction is `Σ scoreᵢ × importanceᵢ`, so every result involving it
depends on which importance is used.

| | [`pathway-prediction-target-analysis.md`](pathway-prediction-target-analysis.md) | This note |
|---|---|---|
| Importance fitted against | the **true sentiment** (`target`) | the **model's prediction** (`classification`) |
| In ML terms | a *probe*: what the pathways can tell you about the task | a *surrogate*: what the model's output tracks |
| Fitted on | the train split, by the NNmaker pipeline | the test split, the only split with predictions |
| Source | the published yelp `pathway_importance` | refit for this note, **in-sample** |
| Used by the explorer today | **yes**, on yelp | not yet (NPW-20) |

If importance is meant to explain the model — which is how the project intends to use
it — the surrogate is the relevant quantity. That is why this note has the plain name.

Everything else is held the same so that the comparison isolates the importance. The
pathway prediction uses the explorer's shipped formula: raw scores times importance,
no intercept, `sum ≥ 0` is class 1. The fit mirrors how the published importance was
produced: pathway scores standardized, an L2-regularized logistic regression with
C = 1 (scikit-learn's default, and what the NNmaker pipeline uses), and the
per-standard-deviation coefficients taken as importance. Details are under
"Provenance" at the end.

On the alien datasets, the generator already fits `pathway_importance` against
`classification`, so the explorer's alien importance is already this note's kind of
quantity (though fitted without regularization). The alien numbers are generated, not
learned, so this note is yelp-only.

## 1. The two importances

| Fit | Fitted against | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|---|---|
| train-fa-6 | target | 5.548 | 0.112 | -0.517 | -0.188 | -0.484 | -0.159 | |
| train-fa-6 | classification | 6.350 | 0.143 | 0.848 | 0.366 | 0.578 | -0.013 | |
| test-fa-7 | target | -5.455 | -0.122 | 0.338 | 0.695 | 0.289 | -0.066 | -0.004 |
| test-fa-7 | classification | -6.388 | 0.656 | -0.480 | -0.824 | -0.157 | -0.017 | 0.163 |
| dev-fa-6 | target | -5.460 | -0.098 | -0.298 | 0.291 | -0.580 | -0.102 | |
| dev-fa-6 | classification | -6.391 | 0.616 | 0.233 | -0.592 | 0.706 | 0.052 | |

P0 keeps its sign and grows by about 15%. The minor pathways are a different story:
**13 of the 16 minor coefficients reverse sign** between the two fits. Everything
below follows from that.

## 2. Agreement with the model

Over the 2,998 scored yelp test reviews:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| full pathway prediction, mismatches vs the model | **9** | **3** | **1** |
| same, as a percentage | 99.70% | 99.90% | 99.97% |
| P0 alone, mismatches vs the model | 27 | 29 | 29 |
| minor pathways fixed a wrong P0 | 26 | 28 | 28 |
| minor pathways broke a correct P0 | 8 | 2 | 0 |

With target-fitted importance the same rows read 54 / 48 / 46 mismatches, 0 / 0 / 0
fixed and 27 / 19 / 17 broken. The minor pathways go from strictly harmful to
correcting nearly every mistake P0 makes. (P0 alone is identical in both notes,
because P0's coefficient keeps its sign.)

Including the fitted intercept, as the regression itself would, moves `train-fa-6`
from 9 to 3 mismatches and leaves the other two fits unchanged.

The two importances also mirror each other against the truth:

| Agreement with the true sentiment | full prediction | P0 alone |
|---|---|---|
| target-fitted importance (other note) | 95.70% | 95.26% |
| classification-fitted importance (this note) | 95.00% / 95.06% / 95.13% | 95.26% |

Each version makes the minor pathways serve whatever it was fitted against. Fitted to
the truth, they help against the truth and hurt against the model. Fitted to the
model, they help against the model and hurt against the truth.

## 3. Disagreement and reconstruction error

This was NPW-16's original question, and **this importance leaves too little
disagreement to answer it**. With 9, 3 and 1 disagreeing reviews, a correlation
between disagreement and reconstruction error is not meaningful. The figures are here
for completeness only:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| disagreeing reviews | 9 | 3 | 1 |
| corr(disagree, residual) | 0.078 | 0.042 | -0.017 |
| partial corr, controlling for \|pathway sum\| | 0.134 | 0.056 | -0.017 |
| mean reconstruction R², agree / disagree | 0.894 / 0.781 | 0.910 / 0.820 | 0.903 / 0.975 |
| disagreements among the 10% nearest the boundary | 8 of 9 | 2 of 3 | 0 of 1 |

This is the practical cost of the surrogate version: a near-perfect surrogate leaves
almost nothing for a disagreement search to find. The original design anticipated it.

One relationship in that analysis *is* measured over all 2,998 reviews and does
change meaningfully. How far a review sits from the decision boundary, `|pathway sum|`,
correlated about -0.77 with the residual under target-fitted importance. Here it is
+0.221, +0.112 and -0.009.

The following is an interpretation consistent with the numbers, not a separate test.
Badly reconstructed reviews are ones where the minor pathways are loud (§5). With
target-fitted importance the minor pathways' contribution runs against the model's
prediction (§4), so loud minor pathways drag the sum toward zero and those reviews
land near the boundary. With classification-fitted importance the contribution runs
with it, so the same reviews are not pulled toward the boundary.

## 4. P0 versus the minor pathways

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| corr(P0 contribution, classification) | 0.987 | 0.986 | 0.986 |
| corr(non-P0 sum, classification) | **+0.175** | **+0.088** | **+0.110** |
| the same under target-fitted importance | -0.181 | -0.061 | -0.070 |

P0 carries the same association with the model's output under either importance. The
minor pathways' combined contribution changes from slightly against the model to
slightly with it.

That shows up most clearly where P0 is weak:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| reviews with \|P0 contribution\| < 1 | 24 | 25 | 21 |
| accuracy vs model: P0 alone | 0.375 | 0.480 | 0.619 |
| accuracy vs model: minor pathways alone | **1.000** | **1.000** | **1.000** |
| accuracy vs model: full prediction | 1.000 | 1.000 | 1.000 |
| reviews with \|P0 contribution\| < 3 | 81 | 79 | 80 |
| accuracy vs model: minor pathways alone | 0.790 | 0.886 | 0.938 |
| accuracy vs model: full prediction | 0.901 | 0.975 | 1.000 |

Under target-fitted importance the minor pathways matched the model on 0–4% of the
weak-P0 reviews. Here they decide every one of them correctly. So the target note's
finding that "the minor pathways do not step in to decide the case" holds only for
that importance. The band sizes differ slightly from the other note because P0's
coefficient is larger here.

## 5. What does not change

Reconstruction works from raw pathway scores and loadings. Importance plays no part,
so these figures are identical to the other note's:

| | train-fa-6 | test-fa-7 | dev-fa-6 |
|---|---|---|---|
| corr(residual, \|P0 score\|) | -0.670 | -0.643 | -0.649 |
| corr(residual, ‖other scores‖) | +0.738 | +0.734 | +0.725 |
| partial(residual, \|P0\| \| others) | -0.094 | -0.269 | -0.360 |
| partial(residual, others \| \|P0\|) | +0.427 | +0.520 | +0.535 |

Under either importance, badly reconstructed reviews are the ones where the minor
pathways are loud.

## 6. Does importance follow connectivity?

The same test as the other note, using this importance. Neurons 768–779 are the
classifier head, and uniform loading mass on them would be 1.54%.

| Fit / pathway | \|importance\| | explained variance | classifier-head mass | final-layer mass |
|---|---|---|---|---|
| train-fa-6 P0 | 6.350 | 0.855 | 1.69% | 0.89% |
| test-fa-7 P0 | 6.388 | 0.819 | 1.73% | 0.92% |
| dev-fa-6 P0 | 6.391 | 0.810 | 1.74% | 0.93% |
| test-fa-7 P1 | 0.656 | 0.053 | 1.10% | 0.33% |
| dev-fa-6 P1 | 0.616 | 0.054 | 1.01% | 0.29% |
| dev-fa-6 P2 | 0.233 | 0.013 | **2.27%** | 0.08% |
| test-fa-7 P2 | 0.480 | 0.008 | 1.70% | 0.02% |
| test-fa-7 P3 | 0.824 | 0.008 | 0.14% | 0.02% |

Rank correlations pooled across all 19 pathways:

| \|importance\| against | target-fitted | classification-fitted |
|---|---|---|
| classifier-head mass | 0.218 | 0.184 |
| final-layer mass | 0.304 | **0.530** |
| explained variance | 0.502 | **0.718** |

With this importance, the association with the layer closest to the output is
noticeably stronger. The pathways with the most final-layer mass after P0 (P1 in
`test-fa-7` and `dev-fa-6`) are the ones whose importance grew most, roughly
fivefold. That fits the idea that connectivity matters more than the target-fitted
numbers suggested.

The counterexamples still stand. `dev-fa-6 P2` has the largest classifier-head mass of
any pathway and about one twenty-seventh of P0's importance. `test-fa-7 P2` matches
P0's head mass with about one-thirteenth of its importance.

## 7. What this means

This note is **less favourable** than the target note to the view that pathways need
not track the model's prediction.

- Under the surrogate definition, the pathway set as a whole reproduces this model's
  output almost exactly (1–9 mismatches in 2,998), and the minor pathways carry real
  output-relevant signal. "The minor pathways make the pathway prediction worse" is a
  property of the target-fitted importance, not of the pathways.
- Importance's association with final-layer mass and explained variance is stronger
  than the target note found.

Three things limit how far that goes:

- **A good surrogate shows association, not mechanism.** A logistic regression can
  reproduce a model's outputs from features that move with the output without those
  features' neurons being what drives it. Factor analysis still never sees a weight,
  and importance is still fitted after the fact.
- **The counterexamples survive.** A pathway can carry as much or more classifier-head
  mass than P0 and a small fraction of its importance.
- **It is in-sample.** The importance is fitted and evaluated on the same reviews. The
  mismatch counts are optimistic, and out-of-sample numbers are future work under
  NPW-20.

The practical trade-off for the explorer: the surrogate is probably the right meaning
for importance, but a disagreement search built on it finds almost nothing. That
matters for NPW-20's decision about which importance the pathway prediction should
use.

## 8. Caveats

- **In-sample.** Fitted and evaluated on the same 2,998 reviews. Cross-validation
  would give honest out-of-sample mismatch counts; that is left for NPW-20.
- **A different split from the published importance.** This importance comes from
  the test split, the only split with predictions. The published one comes from the
  train split. So the two importances differ in split as well as in what they were
  fitted against.
- **The regularization choice matters.** C = 1 matches scikit-learn's default and the
  NNmaker pipeline. Without regularization the fit diverges, because the model's
  predictions are almost perfectly separable from the pathway scores. A different C
  would give different coefficients.
- **No intercept, to match the shipped formula.** Including it changes only
  `train-fa-6` (9 mismatches to 3).
- **Two reviews carry wrong data.** Two reviews that appear in both the train and test
  splits have scrambled pathway data, tracked in
  [NPW-19](https://concord-consortium.atlassian.net/browse/NPW-19). They are included
  here, as in the other note.
- **Yelp only.** Alien datasets are excluded because their numbers are generated.

## Provenance

These figures come from a one-time probe, not from `npm run analyze:pathway-prediction`,
which uses the published target-fitted importance. They can be reproduced from the
published yelp index as follows, for each FA fit:

1. Take the reviews with a `classification` and a `reconstruction_r2` for the fit: the
   2,998 test-split reviews.
2. Standardize each pathway's scores to mean 0 and standard deviation 1 over those
   reviews.
3. Fit an L2-regularized logistic regression of `classification` on the standardized
   scores, with C = 1 and the intercept unpenalized.
4. Take the per-standard-deviation coefficients as that fit's importance.
5. Compute the pathway prediction with the shipped formula, `Σ raw scoreᵢ × importanceᵢ`
   with `sum ≥ 0` as class 1, and run the same measures as the other note.

"P0 contribution" is `pathway_scores[0] × importance[0]`. Loading mass is the share of
a pathway's summed squared loadings that falls on neurons 768–779, from the `loadings`
array in each fit's metadata. Correlations are Pearson; partial correlations are
computed from the three pairwise correlations.
