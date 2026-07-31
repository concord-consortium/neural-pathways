# External Attributes and the Alien Language Dataset — Big Picture

## Overview

This document describes a body of work spanning several sub-projects. It is deliberately
**not** an implementation spec. Each phase in the [Build Order](#build-order) gets its own
spec and plan later. The purpose here is to fix the decisions that every phase depends on,
so those specs don't contradict each other.

Two things are being built:

1. **External attributes** — a general explorer feature. Each item in a dataset carries
   values for a fixed set of named attributes, and new views show how those attributes
   relate to pathways and to the model's classification. This works for every dataset,
   including the existing Yelp data.

2. **The alien language dataset** — an authored dataset where the items are recorded
   conversations in an invented language, accompanied by an observer's English notes.
   It exists to create a teaching situation that the real Yelp data failed to provide.

## Motivation

[neural-pathways-review.md](../../data/neural-pathways-review.md) documents the core
problem: pathway *discovery* worked mechanically (~90% variance explained), but pathway
*interpretation* largely did not. Only P0 (sentiment) and P6 (emotional intensity, via
partial correlation) could be interpreted. The rest resisted meaning.

That is an honest research result and a poor teaching artifact. A student following the
workflow to its end finds nothing, which teaches that the method doesn't work rather than
teaching how the method works.

The alien dataset creates a situation where the workflow terminates — but not trivially.
Three pathways are designed with descending detectability, so that discovery requires
progressively better tools rather than progressively more staring.

### Why an invented language

Three reasons, in priority order:

1. **Students cannot shortcut by reading.** With a Yelp review, a student reads "the food
   was awful" and knows the answer; the pathways are then redundant decoration. Alien text
   is opaque, so the pathways, attributes, and word effects are the *only* route to an
   answer. The observer's notes become the only window into meaning.

2. **Pathways can be designed to have meaning.** The generative factors are chosen in
   advance, so each pathway maps to something nameable. This is the direct fix for the
   documented failure.

3. **The vocabulary is small enough to fully inspect.** ~40 words means a student can see
   every word's effect on every pathway and build a complete picture, rather than sampling
   from a 30k-word vocabulary.

## Scenario

Field researchers have recorded conversations between aliens. An observer watched each
recording and wrote English field notes. The question the model answers is:

> **Based on this conversation, is now a good time to approach them?**

This framing was chosen because it has real stakes for the observer, and because it cannot
be answered by translating the words — it is about the state of the encounter, not its
content.

The observer's notes are where external attributes come from. A coder reads the notes and
assigns attribute values. This is a fiction the app presents; see
[Attribute visibility](#attribute-visibility-and-commissioned-coding).

## Decisions

These were settled during brainstorming and are not open for re-litigation within the
phases below.

| Decision | Choice | Consequence |
|---|---|---|
| Data fidelity | **Fully authored.** No model is trained; no Factor Analysis is run. | See [Honesty constraint](#honesty-constraint). |
| App architecture | **One app, dataset-driven.** No new webpack entry. | The "alien app" is a dataset id plus a feature config in the existing explorer. |
| Generator home | **TypeScript script in this repo, published to S3.** | Fast tuning locally; uniform loading in production. |
| Correlation computation | **On the fly, in the client.** Nothing precomputed. | No correlation fields in the data format. |
| Yelp attributes | **Reinterpret existing metadata.** | Phases 1–3 need no data regeneration. |
| Text ↔ score coupling | **Words carry pathway weights; score = sum.** | SHAP values are exact by construction, not fabricated. |
| Observation display | **Attribute chips always visible; prose note on demand.** | |
| Student coding | **Fictional.** Attributes are pre-authored and unlocked, not entered. | No data-entry UI, no persistence backend. |

### Honesty constraint

Because the data is fully authored, the alien dataset demonstrates **how the method works**.
It is not evidence that a model learned anything, because no model exists. Any curriculum
material built on it must not claim otherwise. The dataset is a worked example, in the same
sense that a physics problem with frictionless surfaces is a worked example.

This constraint is why the internal consistency requirements below matter: an authored
dataset that contradicts itself teaches students to distrust the tools rather than the claim.

## Data Model

### Attribute definitions

```ts
interface AttributeDefinition {
  key: string;          // "voices_raised" — usable directly as a search field
  label: string;        // "Voices raised"
  description: string;  // paragraph; shown on hover and in the search help dialog
  type: "binary" | "integer" | "float";
  min?: number;         // required for integer and float
  max?: number;         // required for integer and float
}
```

Attributes are `0`/`1` initially. The `type` field exists so the model does not need
changing when non-binary attributes arrive.

`key` must not collide with a reserved search field name (`text`, `target_label`,
`reconstruction_r2`, `classification_label`, `classification_probability`,
`has_word_scores`, `pathway_<n>`, or any existing Yelp metadata field). The dataset config
validates this at load time.

An attribute key MAY alias an existing numeric search field when the attribute's derived
value is identical to that field's value — this is why `stars` and `review_stars` are
permitted and are deliberately absent from `RESERVED_FIELD_NAMES`.

### Dataset configuration

```ts
interface DatasetConfig {
  id: string;                          // "yelp" | "alien"
  label: string;
  baseUrl: string;
  itemNoun: { singular: string; plural: string };   // "review" | "conversation"
  attributes: AttributeDefinition[];
  getAttributeValue(review: S3Review, key: string): number | null;
  hasObservations: boolean;
}
```

The indirection through `getAttributeValue` is what lets attributes come from two different
places:

- **Yelp** derives them from fields already present in `index.json`. No data regeneration.
- **Alien** reads a stored `review.attributes` map, with definitions from
  `metadata.attributes` in the data file.

Both paths produce the same `AttributeDefinition[]` and the same value lookup, so every
consumer downstream is dataset-agnostic.

`itemNoun` is not cosmetic. The explorer says "review" throughout its UI; the alien dataset
needs "conversation". Every user-facing string that names the item must draw from the config.

### Yelp attribute set

Derived entirely from existing `index.json` fields — no labeling, no regeneration:

| Key | Type | Source |
|---|---|---|
| `review_stars` | integer 1–5 | `review.review_stars` |
| `stars` | float 1–5 | `review.stars` |
| `target` | binary | `review.target` |
| `model_correct` | binary | `review.classification === review.target` |
| `is_synthetic` | binary | `"synthetic-gpt" in review.sources` |

`model_correct` is the interesting one: it makes the 145 misclassified test reviews
addressable, which is the entry point the
[curriculum notes](../../curriculum-ideas.md) propose for asking "why?" in the first place.

### Data format additions

Alien data only. The existing format is otherwise unchanged, so
[data-loader.ts](../../../src/shared/data-loader.ts) works as-is.

```json
{
  "metadata": {
    "attributes": [
      {
        "key": "voices_raised",
        "label": "Voices raised",
        "description": "One or more participants noticeably increased volume...",
        "type": "binary"
      }
    ]
  },
  "reviews": [
    {
      "id": "a3f7c2d81e09",
      "text": "kel morrun | zhà tik pau | morrun kel",
      "attributes": { "voices_raised": 1, "engaged_in_task": 0 },
      "observation": "Three individuals near the water edge. Voices rose sharply twice..."
    }
  ]
}
```

### FA fit metadata for an authored dataset

The existing format carries a `metadata.fa_fits` entry describing a real Factor Analysis
model. The alien dataset has no such model, so the generator authors only the fields the
explorer actually reads:

| Field | Alien value |
|---|---|
| `n_pathways` | `3` |
| `explained_variance_total`, `explained_variance_per_pathway` | Authored to sum consistently |
| `pathway_importance` | From the logistic fit of classification on pathway scores |
| `pathway_score_min`, `pathway_score_max` | Measured from the generated corpus |
| `source_split` | `"alien"` |

`loadings`, `noise_variance`, `scaler_mean`, and `scaler_scale` describe a mapping from 780
neurons that does not exist here. They are read only by the heatmap app, which is out of
scope. The alien fit omits them, and the type is relaxed to make them optional rather than
having the generator emit fabricated 780-element arrays.

Per-review `reconstruction_r2` and `pathway_variance_fractions` have the same problem: both
describe reconstruction of neuron activations. `pathway_variance_fractions` can be computed
honestly from the pathway scores themselves. `reconstruction_r2` cannot, and is omitted —
the explorer must tolerate its absence and hide the corresponding display rather than
showing an invented number.

### Search integration

Attribute keys become fields on the flattened search object in
[flatten-review.ts](../../../src/explorer/utils/flatten-review.ts), **unprefixed**, so
students write `voices_raised:1` rather than `attr_voices_raised:1`. Collision safety comes
from the reserved-name validation above.

### URL state

`#dataset=alien&review=<id>&fit=<name>&q=<query>`, defaulting to `dataset=yelp`.

## Statistical Views

All computed client-side on every render of the relevant panel. At this scale the cost is
negligible: multiple regression over 6,400 rows × 10 attributes means building a 10×10
normal-equations matrix. Logistic regression via IRLS is roughly ten iterations of the same.
Even with pairwise interaction terms pushing to ~36 columns it remains trivial.

Client-side computation is not merely an optimization — it is **required**, because
[attribute visibility](#attribute-visibility-and-commissioned-coding) changes which
attributes participate, so no result can be precomputed.

### Pairwise correlation matrix

Rows are attributes, columns are pathways, cells are Pearson **r**. For a binary attribute
against a continuous pathway score this is exactly the point-biserial correlation already
used in the existing analysis.

The matrix also covers attribute × attribute and pathway × pathway. The first reveals when
two attributes are near-duplicates; the second confirms pathways are near-orthogonal, which
is useful context for reading everything else.

Clicking a cell opens a drill-down showing the two groups' pathway-score distributions
overlaid, their means, and their separation in standard deviations.

The matrix answers *where should I look?*; the drill-down answers *is this real?* That
split matches how P0, P1, and P2 differ in detectability.

**p-values are deliberately not displayed.** At n in the thousands everything is
"significant", which would teach the wrong lesson. Effect size is the honest display.

### Multiple regression per pathway

Regress a pathway's scores on all visible attributes at once. Reports overall R² plus each
attribute's standardized coefficient and partial correlation, which separates "this
attribute matters independently" from "this attribute is a proxy for that one".

This is the view that delivers what the review document names as the main promise of
pathways — variance coverage. An R² of 0.62 for pathway 1 says: *we have a name for about
62% of this pathway, and 38% is still something we have no word for.* Partial correlation is
also how P6 was confirmed in the real data.

### Logistic regression for classification

The same idea against the model's binary prediction: which attributes predict "good time to
approach"? Reports coefficients and accuracy against a base-rate baseline. This parallels
the existing `pathway_importance` field, which is computed the same way.

### Interaction terms

The design matrix includes all pairwise attribute products, so significant combinations
appear in the results table automatically with no user intervention. There is no UI for
defining logic.

Two honest limitations to display alongside the results:

- With ~36 terms, some interactions will reach conventional significance by chance. The
  display leads with effect size for this reason.
- Pairwise products catch two-way interactions only. Higher-order combinations are not
  modeled. If tuning shows they matter, adding them is an additive change.

## Attribute visibility and commissioned coding

Attributes can be hidden. A hidden attribute exists in the data but is invisible to the
student, who may then decide to "commission" a fictional coder to code it — at which point
the app reveals the pre-authored attribute and it joins every view.

This models the real constraint in qualitative research: coding costs effort, so you must
choose what to look for before you know whether it will pay off.

Two requirements follow:

1. **Hiding must be total.** A single `visibleAttributes` selector feeds the chips, the
   search field list, the search help dialog, the correlation matrix, and every regression.
   A student who cannot see `voices_raised` as a chip but can still type `voices_raised:1`
   into the search box has been handed the answer.

2. **Observation notes must support hidden attributes.** The generator writes evidence for
   *every* attribute into the notes, including hidden ones. Otherwise unlocking an attribute
   reveals something the notes never supported, and the fiction that a coder derived it from
   the notes collapses.

**Open question for that phase:** whether commissioning has a cost (unlock 3 of 8) or is
teacher-controlled. Without some constraint, students unlock everything immediately and the
decision carries no weight. Deferred to the phase 6 spec.

## The Alien Dataset

### Generative model

Everything falls out of three independent latent factors per conversation.

1. **Factors** — `f0, f1, f2 ~ N(0, 1)`, independent. Ground truth; never exposed in the app.

2. **Vocabulary** — ~40 words, each with an authored weight per pathway. Word selection
   during generation is tilted by the factor values, so a high-`f0` conversation draws more
   high-P0 words.

3. **Pathway scores** — exactly the sum of the conversation's word weights, then
   standardized across the corpus. Because standardizing is affine, applying the same
   transform to the word weights preserves SHAP additivity **exactly**:

   ```
   P' = (P - mean) / std
      = sum(w / std) - mean / std
   ```

   So the scaled word scores are `w / std` and `base_value = -mean / std`, constant per
   pathway. No noise term is added to the score, because noise would break additivity;
   the randomness comes from word selection, which is ample.

4. **Attributes** — thresholded `f_i + noise`. The generator numerically solves for the
   noise level that hits each target correlation, since point-biserial r depends on both the
   noise level and the threshold (base rate). This solver is what makes the detectability
   ladder tunable.

5. **Classification** — logistic in `f0`, with roughly 5% error, so `model_correct` is a
   live attribute for the alien set too.

6. **Observation notes** — templates keyed on attribute values, with slot variation for
   naturalness, covering hidden attributes as well as visible ones.

### The detectability ladder

The central design requirement. Three pathways, deliberately differing in how much tooling
it takes to find them:

| Pathway | Attribute | Target r | Findable by |
|---|---|---|---|
| P0 | `voices_raised` | ~0.85 | eye, case by case; also correlates with classification |
| P1 | `engaged_in_task` | ~0.35 | the correlation matrix; not by eye |
| P2 | `group_of_three_or_more` | ~0.15 | the correlation matrix only |

Plus decoy attributes correlating with nothing: `near_water`, `food_present`,
`late_in_cycle`.

This ladder is what justifies building the correlation views at all. P1 and P2 are
undiscoverable without them, so the tool earns its place instead of being decoration.

All values above are **starting parameters, expected to change.** Tuning them against real
classroom use is phase 7. This is why the generator must be parameterized and re-runnable
rather than producing hand-written JSON.

### Scale

~800 conversations, ~40 vocabulary words, 3–6 turns each, 12–40 words per conversation.

800 is enough that a correlation of 0.15 is clearly visible in aggregate while being
invisible case by case — which is precisely the P2 requirement.

## Build Order

The sequencing point that matters: **phases 1–3 need no new data, and phase 4 needs no UI.**
They are independent and can proceed in parallel.

| # | Phase | Runs against | Delivers |
|---|---|---|---|
| 1 | Attribute infrastructure — definitions, dataset config, chips, search integration | Yelp (derived) | Attributes visible and searchable in the real explorer |
| 2 | Correlation matrix + drill-down, incl. pathway × pathway and attribute × attribute | Yelp | The pairwise discovery workflow |
| 3 | Regression panel — OLS per pathway, logistic for classification, interaction terms | Yelp | Variance coverage |
| 4 | Alien dataset generator — TS script, publish to S3 | — | A tunable authored dataset |
| 5 | Alien dataset in the app — dataset switching, item nouns, observation panel | Alien | The alien app exists |
| 6 | Attribute visibility and commissioned coding | Both | The pedagogical sequence |
| 7 | Tuning | Alien | Correlation strengths that actually teach |

Phases 1–3 running against Yelp are worth emphasizing. They exercise all the shared
machinery against real data before any authored data exists to flatter it. If the
correlation views cannot find anything real in the Yelp set, that is worth discovering
before tuning an alien set to be findable.

## Internal Consistency Requirements

Authored data can contradict itself in ways real data cannot. These invariants must hold,
and the generator should assert them:

1. SHAP word scores sum to `pathway_score - base_value` for every pathway of every
   conversation, to floating-point tolerance.
2. Every attribute value is supported by evidence somewhere in that conversation's
   observation note.
3. Measured correlations in the generated corpus match their target parameters within a
   stated tolerance. The generator reports the achieved values.
4. Every vocabulary word appears often enough across the corpus for its word-effect pattern
   to be legible.

## Out of Scope

- Training a real model on alien text, or running real Factor Analysis on alien activations.
- In-app attribute coding by students, with persistence or multi-user sync.
- Student-defined boolean or compound attribute expressions.
- Higher-order (three-way and above) interaction terms.
- Non-binary attribute values. The type system accommodates them; nothing generates them yet.
- Heatmap app changes. This work touches the explorer only.
