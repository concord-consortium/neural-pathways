# Alien Neuron Activations

[NPW-18](https://concord-consortium.atlassian.net/browse/NPW-18) gave both alien
datasets fourteen per-neuron activations per conversation, constructed so that a factor
analysis over them recovers the authored pathways. This note records the construction in
brief and answers the ticket's open question: where is the floor?

Design: [`docs/superpowers/specs/2026-09-15-alien-activations-design.md`](superpowers/specs/2026-09-15-alien-activations-design.md).

## How the activations are built

- Each neuron's noise variance is drawn from `[0.03, 0.2]` and scaled so the mean is 0.1,
  making the total explained variance exactly 0.9, as in the yelp fits.
- A loading matrix is solved so that `L Ψ⁻¹ Lᵀ` is diagonal (scikit-learn's canonical
  form), each pathway's row carries its `targetVarianceShares` share of the 0.9, and each
  neuron's communality is `1 − noise variance`.
- Standardized activations are `scores × loadings + Gaussian noise`; raw activations apply
  a per-neuron scaler drawn from yelp-like ranges.
- The ninth generator self-check, `fa-recovers-pathways`, refits factor analysis on the
  result with a dependency-free port of scikit-learn's algorithm and requires every pathway
  to come back as its own factor, in order, with score correlation ≥ 0.94 and loading
  cosine ≥ 0.97.

## Why 14 neurons

Two limits apply. Factor analysis can identify k factors from n variables only when
`(n − k)² ≥ n + k`; for four pathways that floor is 8 neurons. Above the floor, how well a
pathway's *scores* come back depends on its signal-to-noise ratio, which at 0.9 explained
variance is ample even for the 10% pathway. Fourteen is what the UI/UX designs show, and it
clears both limits with room to spare.

## The sweep

Output of `npm run analyze:activation-floor` on 2026-09-15, which regenerates each dataset
with fewer neurons and less explained variance and reports, per pathway, which recovered
factor it matched (`F`), the score correlation (`r`) and the loading cosine (`cos`):

```
== alien-fa-4
  neurons  explained  P0  P1  P2  P3
  14       0.9        F0 r 0.99 cos 1.00  F1 r 0.98 cos 0.99  F2 r 0.97 cos 0.99  F3 r 0.96 cos 1.00
  12       0.9        F0 r 0.99 cos 1.00  F1 r 0.98 cos 1.00  F2 r 0.96 cos 0.99  F3 r 0.93 cos 0.99
  10       0.9        F0 r 0.99 cos 1.00  F1 r 0.93 cos 0.96  F2 r 0.92 cos 0.93  F3 r 0.94 cos 1.00
  8        0.9        F0 r 0.97 cos 1.00  F1 r 0.80 cos 0.87  F2 r 0.72 cos 0.76  F3 r 0.77 cos 0.64
  14       0.8        F0 r 0.99 cos 1.00  F1 r 0.96 cos 0.99  F2 r 0.95 cos 0.99  F3 r 0.92 cos 1.00
  12       0.8        F0 r 0.99 cos 1.00  F1 r 0.95 cos 1.00  F2 r 0.92 cos 0.98  F3 r 0.88 cos 0.98
  10       0.8        F0 r 0.98 cos 1.00  F1 r 0.93 cos 0.98  F2 r 0.92 cos 0.97  F3 r 0.88 cos 1.00
  8        0.8        F0 r 0.96 cos 0.99  F1 r 0.78 cos 0.88  F2 r 0.71 cos 0.78  F3 r 0.69 cos 0.65

== alien-fa-3
  neurons  explained  P0  P1  P2
  14       0.9        F0 r 0.99 cos 1.00  F1 r 0.99 cos 1.00  F2 r 0.98 cos 0.99
  12       0.9        F0 r 0.99 cos 1.00  F1 r 0.99 cos 1.00  F2 r 0.97 cos 1.00
  10       0.9        F0 r 0.96 cos 0.98  F1 r 0.96 cos 0.96  F2 r 0.96 cos 0.98
  8        0.9        F0 r 0.99 cos 0.99  F1 r 0.95 cos 0.99  F2 r 0.92 cos 0.91
  14       0.8        F0 r 0.98 cos 1.00  F1 r 0.98 cos 1.00  F2 r 0.96 cos 0.98
  12       0.8        F0 r 0.99 cos 1.00  F1 r 0.97 cos 1.00  F2 r 0.95 cos 0.99
  10       0.8        F0 r 0.95 cos 0.98  F1 r 0.95 cos 0.96  F2 r 0.93 cos 0.98
  8        0.8        F0 r 0.97 cos 0.99  F1 r 0.92 cos 0.98  F2 r 0.84 cos 0.88
```

No row threw an error at these neuron counts for either dataset — the sweep's per-row
error handling exists for the case where `solveLoadings` fails to converge, but that did
not happen here; every cell above is a real recovery result, not a placeholder.

## Reading it

Both tables keep every pathway mapped to its own factor in authored order (P0→F0 through
P3→F3 for the four-pathway set, P0→F0 through P2→F2 for the three-pathway set) at every row
tested; no order swaps occur in either sweep at the shipped seed. The sweep varies neuron
count and explained variance only; other seeds can fail `fa-recovers-pathways` at 14 neurons
because the solver leaves the Ψ-weighted factor energies to chance, which is the check's
known weakness and a candidate follow-up. For the four-pathway dataset the first
sub-0.94 correlation appears at 12 neurons (P3, r 0.93), two pathways sit below 0.94 by 10
neurons, and 8 neurons collapses outright: P1–P3 fall to r 0.72–0.80 and one loading cosine
drops to 0.64. The three-pathway dataset holds every pathway at or above r 0.94 down to 10
neurons and only drops below it at 8 neurons (P2, r 0.92) — a smaller degradation, but still
below the shipped 0.94/0.97 recovery thresholds, so 8 neurons is not a usable operating
point for either dataset even though its raw correlation stays higher for the three-pathway
case. Lowering explained variance from 0.9 to 0.8 costs roughly 0.02–0.05 r on the weakest
pathway at 14, 12 and 10 neurons in both datasets, growing to 0.08 for the three-pathway set
at the 8-neuron floor.

## Reconstruction R²

The generator summary reports the per-item R² distribution. On the shipped seed:

- alien-fa-4: reconstruction R² mean 0.766  sd 0.232  p10 0.477
- alien-fa-3: reconstruction R² mean 0.747  sd 0.253  p10 0.410

These are lower and wider than yelp's (mean 0.90, sd 0.08) because R² is taken over an item's
own 14 values rather than 780, which makes the per-item variance in the denominator noisy.
The mean explained variance across the corpus is 0.9 by construction; per-item R² is a
different, noisier statistic.

## Rerunning

```bash
npm run analyze:activation-floor
```

It regenerates both datasets several times over and takes under a minute.
