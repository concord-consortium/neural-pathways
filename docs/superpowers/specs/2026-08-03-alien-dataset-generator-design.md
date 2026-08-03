# Alien Dataset Generator — Design (Phase 4)

## Overview

A TypeScript script that generates the alien-language dataset: ~800 recorded conversations in
an invented language, each with an observer's English note, a set of coded attributes, four
pathway scores, per-word SHAP values, and a model prediction.

It produces no UI. Phase 5 wires the result into the explorer. This phase is done when the
generator emits a dataset in the existing S3 format that satisfies its own consistency
assertions and reports the correlations it actually achieved.

See [2026-07-30-attributes-and-alien-dataset-overview.md](2026-07-30-attributes-and-alien-dataset-overview.md)
for the surrounding project and the decisions this phase inherits.

## Amendments to the Big-Picture Spec

Three decisions here supersede what the overview currently says. **The overview must be
updated when this design is accepted**, or the two documents will contradict each other.

| Overview says | This design says | Why |
|---|---|---|
| Generator home: published to S3 | **Generated at build time into `dist/`** | The data is deterministic from a seed and only a few MB. Committing it would write megabytes of generated JSON into git on every tuning pass, and phase 7 is nothing but tuning passes. Publishing to S3 needs credentials and lets deployed data drift from the branch that produced it. |
| Three pathways | **Four pathways** | P3 carries the planted bias and correlates with nothing in the visible attribute set, so it sits on screen as an unanswered question until the hidden coding is commissioned. |
| Attributes: 3 ladder + 3 decoys, all visible | **9 attributes: 5 visible, 4 hidden**, one of which is the planted bias | Phase 6's commissioned coding needs more than one hidden attribute or there is no choice to make. |

## The World

Field researchers have recorded conversations between aliens. An observer watched each
recording and wrote English field notes. The model predicts: **based on this conversation, is
now a good time to approach them?**

`target` is the truth. `classification` is the model's prediction. They disagree in a
*patterned* way, and finding that pattern is the point of the activity.

## Attributes

| Key | Type | Pathway | Target r | Visible | Role |
|---|---|---|---|---|---|
| `voices_raised` | binary | P0 | 0.85 | yes | ladder — findable by eye |
| `engaged_in_task` | binary | P1 | 0.35 | yes | ladder — needs the matrix |
| `group_size` | integer 1–6 | P2 | 0.15 | yes | ladder — matrix only |
| `near_water` | binary | — | 0 | yes | decoy |
| `food_present` | binary | — | 0 | yes | decoy |
| `resource_stressed` | binary | **P3** | 0.78 | **no** | **the planted bias** |
| `gestures_repeated` | binary | — | 0 | no | decoy |
| `young_present` | binary | — | 0 | no | decoy |
| `carrying_burden` | binary | — | 0 | no | decoy |

All values are starting parameters. Tuning them is phase 7, which is why the solver below
exists.

### `group_size` is provisional

It is the one non-binary attribute, and it may prove too complex for the target students —
the drill-down for an integer attribute is a six-row histogram rather than a two-group
comparison. It is retained for now because keeping it forces both generation paths
(thresholded binary, quantized integer) and both note-fragment styles to exist. **Removing it
later is a one-line config change; adding the first integer attribute back after removing the
path would not be.** Treat it as a supported capability that the shipping dataset may or may
not use.

### The planted bias

`resource_stressed` records whether the group appears resource-secure or resource-stressed —
whether their surroundings show abundance or scarcity.

This was chosen over an obviously-illegitimate attribute such as group markings precisely
because it is **arguable**. A student can reasonably object that resource-stressed groups
might genuinely be more volatile, and therefore that the model is right to use it. That
objection is the same one real biased systems are defended with, and having students argue it
out is the lesson. Bias is a normative claim, not a statistical property.

**The construction that lets the objection be answered empirically:**

```
target         = 1{ γ·z₀ + η > 0 }                    η ~ N(0, σ_target)
classification = logistic( γ·z₀ + β·resource_stressed )
```

`target` does not depend on `resource_stressed` at all. So in this dataset resource condition
demonstrably does *not* predict whether it is a good time to approach — and the model uses it
anyway. The errors are not scattered; they pile up on resource-stressed groups.

**Starting strength.** `β` and `σ_target` are set to hit these interpretable targets rather
than being chosen as raw coefficients:

| | target |
|---|---|
| `resource_stressed` base rate | 30% — 240 of 800 |
| error rate among resource-stressed | 20% — 48 conversations |
| error rate among resource-secure | 3% — 17 conversations |
| overall error rate | 8.1% — 65 of 800 |
| share of all errors that are resource-stressed | **74%** |
| resulting `corr(model_correct, resource_stressed)` | **−0.285** |

That last row is the one that matters for detectability, and 74% is the number a student
actually confronts: filter to the errors and three quarters of them are one kind of group,
which is 30% of the data. Stark enough to notice, not so stark it looks planted.

The generator **asserts** both halves of the construction (see
[Self-checks](#self-checks)). If a tuning change ever made the truth track resource condition,
the model would be correct rather than biased and the activity would silently collapse.

## Generative Model

Seven stages, each a pure function of the previous plus a seeded PRNG.

### 1. Latent factors

`f₀…f₃ ~ N(0,1)` per conversation, independent. These exist **only to tilt word selection**.
Nothing downstream reads them.

### 2. Word selection

Draw 3–6 turns totalling 12–40 words. Each word is sampled with probability proportional to
`exp(λ · f · w)` where `w` is that word's weight vector, so a high-`f₂` conversation pulls
high-P2 words. `λ` controls how sharply the tilt bites.

Turn boundaries are emitted as separator tokens carrying zero weight in every pathway,
mirroring how `[CLS]` and `[SEP]` appear in the real SHAP data. This keeps the rendered text
and the SHAP word list aligned token for token.

### 3. Pathway scores

The exact sum of the drawn words' weights per pathway, then standardized across the corpus:

```
z_p = (Σ w_p − μ_p) / σ_p
```

No noise term is added. Noise would break SHAP additivity; the randomness already comes from
word selection, which is ample.

Each pathway's share of total variance is authored through the relative scale of its words'
weights. Starting split: **P0 55%, P1 20%, P2 15%, P3 10%** — deliberately less lopsided than
the real data's 82/5/1/1, so all four pathways are legible in the UI. Mirroring the real
data's dominance is a tuning option, not a requirement.

**The realized pathway scores must come out near-orthogonal.** Real Factor Analysis produces
orthogonal factors, so the app's pathway × pathway quadrant is expected to be near-zero
off-diagonal — a walkthrough for phase 2 already tells readers to check exactly that. Authored
pathways have no such guarantee for free: a word carries a weight in *every* pathway, so
correlated columns in the vocabulary weight matrix would produce correlated scores.

This is not cosmetic. The bias construction depends on `z₀ ⊥ z₃`: if they correlated, then
`resource_stressed` would correlate with `target` through `z₀`, the truth would track resource
condition, and the model would be right rather than biased.

The vocabulary weight matrix must therefore be designed with near-orthogonal columns, and the
generator asserts the realized result (see [Self-checks](#self-checks)).

### 4. Attributes

Generated from the **realized standardized score**, not from the latent factor:

```
latent_i = a · z_p[i] + √(1−a²) · ε_i          ε ~ N(0,1)
value_i  = threshold(latent_i)                  at the quantile giving the base rate
```

Reading off the realized score rather than `f` keeps the solver one-dimensional. Word sampling
is stochastic, so `corr(f_p, z_p)` is itself uncertain; solving for a target correlation
through that intermediate would be a two-variable problem for no benefit.

Decoy attributes are the same construction with `a = 0`.

Integer attributes quantize `latent` into bins at base-rate quantiles instead of thresholding.

### 5. Classification and target

As given in [the planted bias](#the-planted-bias) above. `target_label` is `"approach"` or
`"wait"`.

### 6. Observation notes

Rendered from attribute values — see [Observation Notes](#observation-notes).

### 7. Emit

Index and SHAP files — see [Output Format](#output-format).

## The Correlation Solver

The mechanism that makes the detectability ladder tunable, and the reason the generator is a
program rather than a fixture.

For an attribute targeting pathway `p` with requested correlation `r*`, bisect on `a ∈ [0,1]`,
computing the achieved point-biserial correlation against the realized `z_p` on each round,
until it lands within tolerance. The relationship is monotone in `a`, so ~30 iterations
suffice, each a pass over 800 rows.

**The generator reports achieved correlations, never requested ones.** Tuning is an
edit-run-read loop; echoing back the number that was asked for would make the output useless.
The run summary prints requested versus achieved for every attribute.

## Determinism

A single `seed` parameter drives one PRNG through every stage. Same seed and config →
byte-identical output.

This is what makes build-time generation safe: every build produces the same dataset, `dist/`
is reproducible, and nothing generated needs committing.

## Vocabulary

~40 words. Each carries a weight per pathway and nothing else — **no glosses, no answer key,
no grammar.**

Meaning is emergent rather than designed: a word with a high P0 weight simply occurs more in
conversations the observer described as heated, so it reads as anger-adjacent without ever
having been defined. This is honest — nothing generated these words from meaning, so
documenting meanings would assert something untrue — and it is exactly what the generative
model already produces at no extra cost.

Word shapes should be pronounceable and visually distinct, so a student can hold a few in mind
while scanning the word-effects panel.

## Observation Notes

### The seam

Notes are produced through an interface the deterministic core does not depend on:

```ts
interface ObservationFacts {
  attributes: Record<string, number>;   // every attribute, hidden included
  flavor: number[];                     // seeded values for non-attribute detail
}

interface NoteRenderer {
  render(facts: ObservationFacts, rng: Rng): string;
}
```

**`TemplateNoteRenderer` ships in this phase.** No API key, no network, fully seeded, so
build-time generation holds.

### Why the seam exists

Convincing notes eventually want a frontier LLM. That conflicts with build-time generation:
API calls are unseeded, need credentials, and cannot run during `npm run build`.

The resolution, when it is wanted, is `LlmNoteRenderer` writing to a **content-addressed cache
committed to the repo**, keyed by a hash of the facts each note describes — not by conversation
id. That distinction matters for tuning: retuning changes attribute values, so notes keyed by
conversation id would all go stale at once, while notes keyed by their content are reused
wherever the facts did not change. The build reads the cache and never calls an API, so
determinism is preserved.

**None of that is built in this phase.** Only the interface is, which costs nothing.

### What the notes must contain

Three requirements, all load-bearing:

1. **Evidence for every attribute, hidden ones included.** Otherwise commissioning a coding in
   phase 6 reveals something the notes never supported, and the fiction that a coder derived it
   from the notes collapses.
2. **Material that is not an attribute.** If every phrase maps to some attribute, a reader can
   enumerate the attribute set from the notes and the exercise degenerates into reading answers
   off a menu. Deciding what is *not* worth coding is part of real coding work.
3. **Enough variety that notes do not read robotically.** With templates this means several
   phrasings per attribute value plus varied ordering and filler. Template variety is
   functional here, not cosmetic.

## Output Format

```
dist/alien-data/
  index.json
  shap/alien-fa-4/{00…ff}.json
```

Emitted in **exactly** the format described in
[../../data/s3-data-format.md](../../data/s3-data-format.md) — 12-hex SHA-256 ids over the
conversation text, `id[:2]` bucketing — so phase 5 reuses `fetchIndex` and `fetchShap`
unchanged rather than writing a second loader. With 800 conversations across 256 buckets each
SHAP file holds ~3 conversations; the files are tiny and that is fine.

**No activation files.** The explorer never reads them and the heatmap is out of scope.

### Per-conversation fields

Standard fields as in the format doc, plus:

- `attributes` — every attribute including hidden ones. Hiding is a phase 6 display concern;
  the data carries everything.
- `observation` — the observer's note.
- `has_shap: ["alien-fa-4"]` for every conversation — SHAP is exact by construction.
- `pathway_variance_fractions` — computed honestly as `z_p² / Σz_p²` for that conversation.
- **`reconstruction_r2` is omitted.** It measures reconstruction of neuron activations, which
  do not exist here. Emitting a number would be inventing one.

### SHAP values

Exact, not approximated. Since `z = Σwᵢ/σ − μ/σ`, each word's contribution is `wᵢ/σ` and
`base_value` is `−μ/σ`, constant per pathway. `unmasked_values` is the conversation's `z`.

### Fit metadata

Fit name `alien-fa-4`.

| Field | Value |
|---|---|
| `source_split` | `"alien"` |
| `n_pathways` | `4` |
| `explained_variance_per_pathway` | Each pathway's share of the total variance of the raw pre-standardization sums |
| `pathway_importance` | Logistic fit of `classification` on the four standardized scores |
| `pathway_score_min` / `max` | Measured from the corpus |

`explained_variance_total`, `loadings`, `noise_variance`, `scaler_mean`, and `scaler_scale` are
**omitted**. They describe a 780-neuron factor model that does not exist here, and the
explorer does not read them. The overview already relaxes these to optional.

`pathway_importance` can reuse `logisticRegression` from
[../../../src/explorer/utils/regression.ts](../../../src/explorer/utils/regression.ts), which
phase 3 built as a dependency-free pure function.

`metadata.review_sets` carries a single entry, `alien`, with the conversation count.

`metadata.attributes` carries the `AttributeDefinition[]`, per the overview's data-format
additions.

## Configuration — the Swap Surface

Every choice above lives in one config module so that changing the dataset does not mean
changing the generator. One attribute is one self-contained object:

```ts
{
  key: "voices_raised",
  label: "Voices raised",
  description: "One or more participants noticeably increased volume…",
  type: "binary",
  pathway: 0,              // which pathway it tracks; null for a decoy
  targetR: 0.85,
  hidden: false,
  baseRate: 0.35,
  valueLabels: { 0: "no", 1: "yes" },
  notes: {
    1: ["Voices rose sharply twice.", "One raised their voice mid-exchange.", …],
    0: ["Tones stayed level throughout.", …],
  },
}
```

Free to change: names, labels, descriptions, which attributes are decoys, which are hidden,
every target correlation, base rates, vocabulary, conversation count, pathway count, variance
split, seed, and which attribute the classification is biased by.

**Not free:** the note fragments are authored English. A new attribute needs several sentences
per value written by a person. Co-locating them with the definition keeps the cost contained to
one object rather than scattered across files, but it does not remove it. Attributes also have
to fit the fiction, which is authorial judgment.

## Self-checks

The generator asserts these and fails loudly rather than emitting a quietly broken dataset.

1. **SHAP additivity** — word scores sum to `z − base_value` for every pathway of every
   conversation, to floating-point tolerance.
2. **Note evidence** — every attribute value, hidden included, is supported by text in that
   conversation's note.
3. **Achieved correlations** — within tolerance of their targets; achieved values are always
   reported.
4. **Word coverage** — every vocabulary word appears often enough across the corpus for its
   word-effect pattern to be legible.
5. **Truth is unbiased** — `|corr(target, resource_stressed)|` is below a threshold. If the
   truth tracked resource condition, the model would be correct rather than biased.
6. **The bias is detectable** — `corr(model_correct, resource_stressed)` is above a threshold.
7. **Decoys are decoys** — every attribute with `pathway: null` correlates with every pathway
   below a threshold.
8. **Pathways are near-orthogonal** — every off-diagonal pathway × pathway correlation is
   below a threshold, matching what real Factor Analysis would produce and what the bias
   construction depends on.

Checks 5, 6 and 8 are the ones most likely to catch a tuning change that silently breaks the
lesson. Each failure has a distinct meaning worth stating in the walkthrough: 5 means the truth
has started tracking resource condition and the model is no longer biased but correct; 6 means
the bias is there but too weak to find; 8 means the vocabulary weights have drifted into
correlated columns, which quietly undermines both.

## Tuning Workflow

Phase 7's inner loop, which this phase must make cheap:

```
edit scripts/alien-config.ts  →  npm run generate:alien  →  read the summary
```

The summary prints, for every attribute, requested versus achieved correlation with each
pathway; the variance split actually realized; the classification accuracy and error rate; and
the outcome of every self-check.

## Out of Scope

- Any UI. Phase 5 wires the dataset into the explorer.
- Attribute visibility and commissioned coding. Phase 6. The data carries `hidden` flags; the
  app ignores them until then.
- LLM-written observation notes. The seam is built; the renderer is not.
- Word glosses, an answer key, or grammar.
- Activation files and anything the heatmap would need.
- Publishing to S3.
- Tuning the parameters to values that actually teach well. Phase 7.

## Walkthrough

Per the overview's standing requirement, this phase ships a walkthrough. Because the generator
has no UI, `docs/testing-alien-generator.md` is a new document rather than an extension of the
correlations walkthrough: how to run the generator, how to read its summary, what each
self-check means and what a failure indicates, and how to change a parameter and confirm the
change took effect.
