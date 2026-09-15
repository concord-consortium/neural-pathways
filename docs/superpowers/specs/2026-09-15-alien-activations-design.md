# Alien Neuron Activations — Design

## Overview

Give both alien datasets real per-neuron activations, constructed so that factor analysis over
them recovers the authored pathways, and let the heatmap app show them.

Jira: [NPW-18](https://concord-consortium.atlassian.net/browse/NPW-18).

Today the generator standardizes each pathway score across the corpus and emits no activations.
`S3FaFit` marks `loadings`, `noise_variance`, `scaler_mean` and `scaler_scale` optional and
`S3Item.reconstruction_r2` optional precisely because there were no neurons to describe. The
heatmap is hard-wired to the yelp dataset. After this work every shipped dataset has an
activation model, the heatmap can open any of them, and a ninth generator self-check proves the
recovery claim on every run.

The ticket targeted 16 neurons. The UI/UX designs use **14**, and 14 is enough: see
[Why 14 neurons is enough](#why-14-neurons-is-enough).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Neuron count | **14** | What the UI/UX designs use, and comfortably above the identifiability floor. |
| Loading pattern | **Seeded random sketch**, solved into exact loadings by the generator | Nobody has a hand-drawn pattern yet; a sketch can be swapped in later without changing the solver. |
| Noise | **Independent Gaussian per neuron**, variance forced by standardization | Exactly the model FA assumes, so the recovery check is unambiguous. Yelp's residual mechanism (loud minor pathways reconstruct worse) is not imitated; nobody analyses residuals on alien data and the NPW-16 note excludes it for that reason. |
| Explained variance | **0.90 total**, split by the existing `targetVarianceShares` | Matches the yelp fits and the NNMaker rule of adding pathways until 90%. Gives a clean elbow at the authored pathway count. |
| Recovery check | **A TypeScript port of scikit-learn's FactorAnalysis** as a ninth self-check | Runs on every generate with no new dependency; a one-off Python check would rot the next time the config is retuned. |
| Emitted scores | **The authored scores, unchanged** | SHAP additivity, the attribute solver and the outcomes are all built on them. The recovered scores are what the check compares against, not what ships. |
| Heatmap | **Dataset param + selector, and the dataset's item noun** | The minimum to load alien data, plus wording so the page does not call a conversation a review. |
| Build caching | **Out of scope** | Split to [NPW-21](https://concord-consortium.atlassian.net/browse/NPW-21). |

## Why 14 neurons is enough

Two separate limits apply.

**Identifiability.** With `n` neurons, factor analysis can identify `k` factors when
`(n − k)² ≥ n + k` (the Ledermann bound). For four pathways the floor is 8 neurons; with 14
neurons up to 9 pathways are identifiable. Config validation enforces this inequality.

**Score recovery.** How well a pathway's *scores* come back depends on its signal-to-noise
ratio, `Σⱼ L²ₚⱼ / ψⱼ`, not directly on the neuron count. At 0.90 explained variance the weakest
alien pathway (10% of the common variance) has an SNR around 12, so its recovered scores should
correlate about 0.96 with the authored ones. With 800 conversations the loadings themselves
recover cleanly.

## What the yelp fits look like

Measured on the published yelp index (`train-fa-6`, `test-fa-7`, `dev-fa-6`) on 2026-09-15,
because the alien data should read as the same kind of object:

| property | yelp |
|---|---|
| `explained_variance_total` | 0.90 |
| per-neuron communality + noise variance | 1.00 (sd 0.001) |
| rows of `loadings` weighted by `1/noise_variance` | exactly orthogonal |
| per-item R² mean / sd / 10th percentile | 0.90 / 0.08 / 0.80 |
| `scaler_mean` 10th–90th percentile | −0.6 to 0.6 |
| `scaler_scale` 10th–90th percentile | 0.1 to 0.7 |

Two of these shape the design. Because the activations are standardized before fitting, each
neuron's noise variance is `1 − communality`: noise is not a free knob once the loadings are
chosen. And scikit-learn returns loadings in a canonical form where `L Ψ⁻¹ Lᵀ` is diagonal.
Loadings authored to satisfy the same condition come back from FA unrotated, in order, up to
sign. Loadings that do not come back as a rotation of themselves, and "recovers" stops meaning
anything precise.

## The activation stage

### Placement

`buildActivations(scores, config, rng)` is a new stage in `scripts/alien/pipeline.ts`, run
after `renderNotes` and before `buildDataset`. It is the last consumer of the seeded RNG, so
every existing output — text, attributes, outcomes, notes, SHAP — stays byte-identical for both
datasets. Only new fields and files appear. `GeneratorRun` gains an `activations` member.

### Config

A shared `ACTIVATIONS` constant in `scripts/alien/config-common.ts`, referenced by both configs
as `activations: ACTIVATIONS`, the way `THRESHOLDS` is:

```ts
export interface ActivationConfig {
  /** Width of the loading matrix. Must satisfy (neuronCount - pathwayCount)^2 >= neuronCount + pathwayCount. */
  neuronCount: number;                 // 14
  /** Share of standardized activation variance the pathways carry; the rest is per-neuron noise. */
  explainedVarianceTotal: number;      // 0.9
  /** Neurons each pathway leans on in the random sketch. */
  strongNeuronsPerPathway: number;     // 5
  /** Sketch magnitude of the remaining neurons relative to the strong ones. */
  weakLoadingRatio: number;            // 0.15
  /** Raw scaler per neuron is drawn uniformly from these. */
  scalerMeanRange: [number, number];   // [-0.6, 0.6]
  scalerScaleRange: [number, number];  // [0.1, 0.7]
}
```

`Thresholds` gains two entries:

```ts
  /** Smallest |r| between a recovered factor's scores and the authored pathway it matches. */
  faScoreRecoveryMin: number;     // 0.95
  /** Smallest |cosine| between a recovered loading row and the authored one. */
  faLoadingRecoveryMin: number;   // 0.98
```

`validateConfig` checks the Ledermann inequality, `0 < explainedVarianceTotal < 1`,
`1 ≤ strongNeuronsPerPathway ≤ neuronCount`, `0 ≤ weakLoadingRatio ≤ 1`, that each range is
ordered and the scale range is positive, and that both recovery thresholds lie in `(0, 1]`.

### The sketch

For each pathway, draw `strongNeuronsPerPathway` distinct neuron indices; those entries get
magnitude 1, the rest get `weakLoadingRatio`; every entry gets a random sign. This is a shape,
not the loadings: its rows are neither orthogonal nor correctly scaled.

### The solver

Target row energy `eₚ = targetVarianceShares[p] × explainedVarianceTotal × neuronCount`.
Starting from the sketch scaled to those energies, iterate to a fixed point:

1. `ψⱼ = 1 − Σₚ L²ₚⱼ` for each neuron.
2. Gram-Schmidt the rows in pathway order under the inner product `⟨a, b⟩ = Σⱼ aⱼbⱼ / ψⱼ`, so
   P0 keeps its sketched direction and each later row is adjusted against the earlier ones.
3. Rescale each row to energy `eₚ` (plain Euclidean energy, which is what explained variance
   measures).

Stop when the largest change in any loading is below 1e-10; throw if 1000 iterations pass
without that. Throw, with a message naming the neuron, if any `ψⱼ` drops below 0.02: that
means the sketch concentrates more than one unit of variance on a neuron, and the fix is a
less concentrated sketch or a lower `explainedVarianceTotal`, not a smaller floor.

The result satisfies `L Ψ⁻¹ Lᵀ` diagonal with distinct diagonal entries (the shares are
distinct), so the FA canonical form is the authored matrix up to the sign of each row.

### Drawing

For conversation `i` with authored scores `zᵢ`:

- standardized: `xᵢ = zᵢ L + εᵢ`, `εᵢⱼ ~ N(0, ψⱼ)`;
- raw: `rᵢⱼ = xᵢⱼ × scaleⱼ + meanⱼ`, with `meanⱼ` and `scaleⱼ` drawn once per dataset from the
  configured ranges;
- `reconstruction_r2ᵢ = 1 − mean((xᵢ − zᵢL)²) / var(xᵢ)`, the NNMaker definition, with both
  the mean and the variance taken over the item's own 14 values.

The emitted scaler is the drawn one, not a refit on the sample. The heatmap standardizes raw
activations with the emitted scaler, so this makes what it computes equal `xᵢ` exactly, and the
R² it would compute equal the R² in the index.

### Fit fields

`explained_variance_per_pathway[p] = ‖Lₚ‖² / neuronCount` and `explained_variance_total` is
their sum, the same definitions the yelp fits use. `explainedVariance` in `emit.ts`, which
currently derives the split from the word-sum standard deviations, is replaced. The word-sum
split still prints in the summary (see below).

## The factor-analysis port

### `scripts/alien/linear-algebra.ts`

- `symmetricEigen(matrix)` — cyclic Jacobi rotations, returning eigenvalues in descending order
  with their eigenvectors. Sizes here are at most 14×14.
- `invert(matrix)` — Gauss-Jordan with partial pivoting, for the k×k matrices in scoring.

### `scripts/alien/factor-analysis.ts`

A port of scikit-learn's `FactorAnalysis` (the SVD-based EM from Barber 21.2), written against
the covariance rather than the data matrix because the eigen-solver is 14×14:

```ts
export interface FactorAnalysisFit {
  /** k x n, in scikit-learn's canonical order (descending weighted variance). */
  loadings: number[][];
  noiseVariance: number[];
  /** ‖loadings[p]‖² / n, per factor. */
  explainedVariancePerFactor: number[];
  explainedVarianceTotal: number;
  iterations: number;
  converged: boolean;
}

export function fitFactorAnalysis(x: number[][], factorCount: number): FactorAnalysisFit
export function factorScores(x: number[][], fit: FactorAnalysisFit): number[][]
```

`fitFactorAnalysis` centers `x`, starts with `ψ = 1`, and repeats: whiten the covariance by
`1/√ψ`, take the top-k eigenpairs, set `W = √max(λ − 1, 0) · vᵀ · √ψ`, set
`ψ = max(var − Σ W², 1e-12)`, compute the log-likelihood, stop when its gain is below 1e-2 or
after 1000 iterations. Those constants are scikit-learn's defaults so the fit is comparable to
the yelp pipeline's. `factorScores` is scikit-learn's `transform`:
`z = x Ψ⁻¹ Wᵀ (I + W Ψ⁻¹ Wᵀ)⁻¹`.

## The recovery check

`faRecoversPathways(run)` in `checks.ts`, ninth in the list:

1. Fit FA with `k = pathwayCount` on the standardized activations; compute scores.
2. For every authored pathway `p`, find the recovered factor `q` maximising
   `|corr(authored scoresₚ, recovered scores_q)|`.
3. Pass when the `p → q` matching is the identity permutation, every `|r|` is at least
   `faScoreRecoveryMin`, and every `|cosine(Lₚ, W_q)|` is at least `faLoadingRecoveryMin`.

The identity requirement is deliberate: the story is that FA returns *these* pathways *in this
order*, and a sketch whose weighted energies put P2 ahead of P1 is a tuning problem worth
failing on. The failing detail names the pathway, the factor it matched, and the numbers.

## Summary

`formatSummary` gains an `activations` section:

```
activations
  14 neurons, explained variance total 0.900 target -> 0.903 refit
  loadings share    P0 0.495  P1 0.180  P2 0.135  P3 0.090
  reconstruction R2   mean 0.88  sd 0.09  p10 0.76
  FA recovery         P0 r 0.998 cos 0.999   P1 r 0.984 cos 0.995   P2 r 0.975 cos 0.992   P3 r 0.962 cos 0.988
  refit explained variance by pathway count   1: 0.50  2: 0.68  3: 0.81  4: 0.90  5: 0.91
```

The layout is the design; the numbers are illustrative until the generator prints real ones,
which the walkthrough then quotes.

The existing "variance split" block is relabelled as the word-sum split, since it is what the
`SCALE` constants were tuned for and it still governs how strongly each pathway tilts word
choice, but it is no longer what the app reports as explained variance. The refit-by-count
line is a report, not a check; it is the elbow a future "how many pathways do you need"
slider would be built from.

## Wire format and app types

**Emit.** `writeDataset` writes `activations/<bucket>.json` beside `shap/`, bucketed by the
first two hex characters of the id, each `{ reviews: [{ id, activations }] }` with the raw
14-value vector — the shape `fetchActivations` already reads. Each item gains
`reconstruction_r2: { [fitName]: r2 }`. `emit.ts` gets an `ActivationBucketWire` type
mirroring `ShapBucketWire`, and `Dataset` gains `activationBuckets`.

**Types.** The activation fields on `S3FaFit` and `reconstruction_r2` on `S3Item` stay
optional. Every shipped dataset now has them, but the optionality keeps the loud failure in
`data-loader.ts` for any future dataset without an activation model. The `S3FaFit` comment is
rewritten to say that, since its current justification stops being true.

**Explorer.** `flattenItem` already copies `reconstruction_r2` when present, so
`reconstruction_r2:<0.8` becomes a working search on the alien datasets and the item panel's
R² fills in. No explorer code changes.

**Size.** About 800 × 14 numbers per dataset, under half a megabyte across the buckets. The
webpack clean-pattern exclusions already cover the whole alien-data directories.

## The heatmap

**Dataset choice.** The heatmap reads `dataset` from the hash the way the explorer does,
defaulting to yelp, and writes it back alongside `review` and `fit`. `DatasetSelector` moves
from `src/explorer/components/` to `src/shared/components/` with neutral class names
(`dataset-label`, `dataset-selector`) and id; the explorer imports it from there. The
heatmap's toolbar shows it beside the FA fit dropdown. Switching datasets refetches the index,
clears the activation cache, and resets the selected item, fit and score overrides.

**Wording.** Visible text that says "review" uses the dataset's `itemNoun`: the select
placeholder, both "Select a review" placeholders, the "Current review" scale-mode option, and
the terminology table's "for this review" label. FA-terminology mode keeps "observation". The
review panel's "Sentiment:" line becomes "Target:" followed by `target_label`, since the alien
labels are approach and wait, and the panel's colour rules gain `approach` and `wait` beside
`positive` and `negative`. The "Source:" and business-name lines already render only when
their fields exist.

**Out of scope.** Renaming internal identifiers such as `ReviewPanel` or `selectedReviewId`.

**Confirming the ticket's last item.** `heatmap.html#dataset=alien` shows 14 neuron columns,
four pathway patterns, a conversation's standardized and raw activations, the reconstruction,
the residual and its R². Same for `alien3`.

## Testing

**Generator.**

- `linear-algebra.test.ts` — Jacobi returns the known eigenpairs of a small symmetric matrix
  and reconstructs it; `invert` times the original is the identity; a singular matrix throws.
- `factor-analysis.test.ts` — on data built from two planted, `Ψ⁻¹`-orthogonal factors plus
  noise, the fit recovers the loadings up to sign and the noise variance within tolerance, and
  `factorScores` correlate above 0.95 with the planted scores; asking for one factor more than
  planted leaves a near-zero extra factor; the fit converges.
- `activations.test.ts` — the solved rows hit their target energies; `L Ψ⁻¹ Lᵀ` is diagonal;
  `ψ = 1 − communality` per neuron; the same seed reproduces the same matrices; the drawn
  scaler lies in its ranges; an over-concentrated sketch throws with the neuron named.
- `emit.test.ts` — activation buckets are keyed by id prefix and cover every item; every
  item's R² is at most 1; the fit carries the five activation fields and both
  explained-variance numbers, with the per-pathway values summing to the total.
- `checks.test.ts` — the recovery check passes on a real run and fails when the activations
  are shuffled across items.
- `config-validation.test.ts` — a neuron count below the identifiability floor is rejected;
  so is a threshold outside `(0, 1]`.
- `emit.test.ts` — the two tests that currently assert "no activation model" and "omits
  reconstruction_r2" flip to assert presence.
- Unchanged existing output is verified once during implementation, not by a unit test:
  generate both datasets before and after the change and confirm every item's `text`,
  `attributes`, `observation`, `target`, `classification` and `pathway_scores` are identical,
  which proves the stage sits after every other RNG consumer. The walkthrough records the
  result.

**App.**

- `app.test.tsx` (heatmap) — `#dataset=alien` selects the alien dataset; changing the selector
  refetches the index; the noun and the "Target:" wording render from the dataset.
- `dataset-selector.test.tsx` moves with the component.

**Playwright.** The existing heatmap smoke test keeps passing against yelp. No new
end-to-end tests.

## Documentation

- `docs/testing-alien-generator.md` — the `activations` summary section with real numbers,
  the ninth check, and the new files on disk.
- `docs/testing-alien-explorer.md` — correct the line saying the alien data has no per-neuron
  activation files; add a `reconstruction_r2` search step.
- New `docs/testing-alien-heatmap.md` — loading each alien dataset in the heatmap and what to
  see.
- New `docs/alien-activations.md` — the floor report the ticket asks for: after the check
  works, sweep `neuronCount` downward on both datasets and a couple of lower
  `explainedVarianceTotal` values, and record the recovery correlations. The shipped config
  stays at 14 and 0.90.

## Out of scope

- Skipping regeneration when the generator inputs are unchanged — NPW-21.
- Any change to the yelp data or the NNMaker pipeline.
- A hand-authored loading sketch; the solver accepts one later without changing.
- Imitating yelp's residual mechanism with item-dependent noise.
- Refitting pathway scores from the activations; the authored scores ship.
- Explorer UI for activations; the explorer only gains the R² field it already knew how to read.
