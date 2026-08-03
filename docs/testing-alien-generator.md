# Manually Testing the Alien Dataset Generator

The alien dataset generator (`scripts/generate-alien-data.ts`, configured by
`scripts/alien-config.ts`) is a seeded TypeScript script that synthesizes ~800
"alien language" conversations into the project's existing S3 data format: four
pathway scores, exact SHAP word attributions, nine coded attributes, and a
deliberately biased model prediction. It has no UI of its own — everything below
is exercised from the command line and by reading the JSON it writes.

Run it with:

```bash
npm run generate:alien
```

Every number quoted below came from a real run of that command on this branch.
Where a section asks you to change something, it also says what to change it back
to — do that before moving on, and never leave the config edited when you're done
testing.

## 1. Running it

```bash
npm run generate:alien
```

On this machine this finishes in about a second — `ts-node`'s startup dominates,
the generation itself is fast. Two consecutive runs produce a byte-identical
`dist/alien-data/index.json`, because the seed and every other input are fixed in
`scripts/alien-config.ts`.

It writes:

- `dist/alien-data/index.json` — the review index (metadata, attributes, text,
  target, pathway scores, classification, for all 800 conversations).
- `dist/alien-data/shap/alien-fa-4/*.json` — SHAP word-attribution buckets, one
  file per two-hex-character prefix of the conversation id.

`npm run build` runs this generator too, as one step of
`npm-run-all lint:build generate:alien build:webpack`. `dist/alien-data/` is
excluded from `CleanWebpackPlugin`'s clean patterns
(`webpack.config.js`), so a webpack build does not delete it — the data is meant
to persist across builds that don't touch it.

`writeDataset` deletes and rewrites the whole output directory on every run, so
there is no cache to invalidate. **To force a regenerate**, just run
`npm run generate:alien` again (or `npm run build`, which includes it).

## 2. Reading the run summary

Run `npm run generate:alien` and read the printed summary top to bottom. A
representative real run looks like this:

```
alien dataset — seed 20260803, 800 conversations
output dist/alien-data, fit "alien-fa-4"

variance split (target -> realized)
  P0  55.0% -> 55.0%
  P1  20.0% -> 20.0%
  P2  15.0% -> 15.0%
  P3  10.0% -> 10.0%

pathway x pathway correlation
  P0  1.000   -0.010  0.012   -0.014
  P1  -0.010  1.000   0.020   -0.021
  P2  0.012   0.020   1.000   0.019
  P3  -0.014  -0.021  0.019   1.000

attributes
  key                 pathway  requested  achieved  ceiling  hidden  shares
  voices_raised       P0       0.650      0.652     0.717    no      65.0% 35.0%
  engaged_in_task     P1       0.350      0.346     0.724    no      50.0% 50.0%
  group_size          P2       0.150      0.149     0.937    no      8.0% 22.0% 28.0% 22.0% 14.0% 6.0%
  near_water          decoy    -          -         -        no      60.0% 40.0%
  food_present        decoy    -          -         -        no      55.0% 45.0%
  resource_stressed   P3       0.650      0.649     0.736    yes     70.0% 30.0%
  gestures_repeated   decoy    -          -         -        yes     65.0% 35.0%
  young_present       decoy    -          -         -        yes     75.0% 25.0%
  carrying_burden     decoy    -          -         -        yes     70.0% 30.0%

classification
  solved sigma_target 0.1052, beta -0.3167 on "resource_stressed"
  target positive rate            48.3%
  error rate, resource_stressed=1   20.0% requested -> 19.6% achieved
  error rate, resource_stressed=0   3.0% requested -> 2.9% achieved
  overall error rate              7.9%
  share of errors on the group    74.6%
  corr(model_correct, bias)       -0.2846
  corr(target, bias)              0.0120

self-checks
  PASS  shap-additivity           largest deviation 1.78e-15 (limit 1.00e-9)
  PASS  note-evidence             all 800 notes attest all 9 attributes exactly once
  PASS  achieved-correlations     largest gap 0.0038 (tolerance 0.02)
  PASS  word-coverage             rarest word appears in 291 conversations (minimum 100)
  PASS  truth-is-unbiased         corr(target, resource_stressed) = 0.0120 (limit 0.08). ...
  PASS  bias-is-detectable        corr(model_correct, resource_stressed) = -0.2846 (minimum magnitude 0.2). ...
  PASS  decoys-are-decoys         largest decoy correlation 0.0597 (limit 0.15)
  PASS  pathways-are-orthogonal   largest off-diagonal |r| 0.0212 (limit 0.12)

wrote 800 conversations to /Users/.../dist/alien-data
```

Block by block:

- **Variance split** — each pathway's target share of total score variance next
  to what the data actually realized. Healthy: the two numbers on each line
  match closely (here, exactly to one decimal place). A wide gap means the
  factor construction isn't hitting `targetVarianceShares`.
- **Pathway x pathway correlation** — the 4x4 correlation matrix between the
  raw pathway scores. Healthy: a `1.000` diagonal and small off-diagonal values
  (here, all under 0.03 in magnitude) — the pathways are supposed to be
  independent constructs. Self-check 8 (`pathways-are-orthogonal`) is this
  same matrix judged against a threshold.
- **Attributes table** — one row per coded attribute. Covered in detail in
  section 3.
- **Classification block** — the bias mechanics: the solved logistic parameters,
  the target's positive rate, the model's error rate split by the (hidden) bias
  attribute, and the two correlations self-checks 5 and 6 judge. Healthy: the
  "requested -> achieved" pairs are close (here, 20.0% vs 19.6% and 3.0% vs
  2.9%), and `corr(model_correct, bias)` is clearly non-zero while
  `corr(target, bias)` is close to zero — the model's mistakes track the hidden
  attribute even though the ground truth doesn't.
- **Self-checks** — eight `PASS`/`FAIL` lines, each with the measured value it
  was judged on. Healthy: all eight read `PASS`. Any `FAIL` also prints exit
  code 1 from `npm run generate:alien`. Section 4 covers each check.

A bug is any block whose numbers don't match the description above — e.g. a
variance split that's badly off, a pathway correlation far from 0, or a
self-check failing on a config nobody touched.

## 3. Requested versus achieved

The attribute table (section 2, "attributes" block) prints three numeric
columns for every attribute that belongs to a pathway (decoys show `-` in all
three, since they aren't tuned to correlate with anything):

- **requested** — the `targetR` set in `scripts/alien-config.ts`.
- **achieved** — the correlation actually measured between the produced
  attribute values and their pathway's score, computed from the written data,
  not assumed.
- **ceiling** — the strongest correlation reachable at all, given the
  attribute's value shares. A binary (or few-valued) attribute is a cut of a
  continuous latent, and a hard cut can never track that latent perfectly, so
  the ceiling sits below 1.0. It also depends on how the value shares are
  split: on this run, `engaged_in_task`'s near-even 50/50 split gives it the
  highest ceiling among the binary attributes, **0.724**; `voices_raised`
  (65/35) and `resource_stressed` (70/30) sit a bit lower, at **0.717** and
  **0.736**. `group_size` isn't binary — it's a six-way integer split — and
  cutting a continuous latent into six ordered bins preserves much more
  information than cutting it into two, so its ceiling is far higher: **0.937**.

`achieved-correlations` (self-check 3) fails if any attribute's achieved value
drifts too far from its requested one; `solveAttribute` (in
`scripts/alien/attributes.ts`) itself throws before that if you request a
`targetR` above the ceiling — see section 7.

## 4. The eight self-checks

Each subsection: what it measures, what a failure means, what to change.

### shap-additivity

Measures the largest gap, across every conversation and pathway, between a
pathway's score and its own SHAP decomposition (`[CLS]` + every word's score +
`[SEP]`, plus the base value). A failure means the SHAP values written to
`dist/alien-data/shap/` don't actually explain the pathway score — a bug in
`scripts/alien/emit.ts`'s `shapForConversation`, not something to fix by
changing config.

### note-evidence

Measures whether every one of the 800 generated notes contains exactly one
note fragment per attribute, matching that conversation's actual coded value (no
fragment for a *different* value, no missing fragment, no fragment counted
twice). A failure means `scripts/alien/notes.ts`'s template renderer or the
fragment library in `scripts/alien-config.ts` produced or lost evidence — check
for a fragment that's a substring of another attribute's fragment, or a value
with too few fragments.

### achieved-correlations

Measures the largest gap between requested and achieved `targetR` across every
non-decoy attribute. A failure means the bisection search in `solveAttribute`
didn't converge close enough — usually because `targetR` is close to the
ceiling (see section 3) or `config.thresholds.correlationTolerance` was
tightened past what the solver can reliably hit.

### word-coverage

Measures the rarest vocabulary word's conversation count (a word counted once
per conversation it appears in, not per occurrence). A failure means some word
is too rare to be a reliable evidence source — widen `minWords`/`maxWords`, add
more magnitude tiers, or lower `thresholds.minWordOccurrences`.

### truth-is-unbiased

Measures `corr(target, resource_stressed)` — the correlation between the
ground-truth label and the hidden bias attribute. **A failure here means the
truth has started tracking resource condition, and the model would then be
correct rather than biased** — the whole point of this dataset is a model that
is *wrong* in a way correlated with a hidden attribute, not one that has simply
learned a real signal. Fix by lowering the bias attribute's pull on the truth
pathway, or picking a different attribute for `biasAttributeKey`.

### bias-is-detectable

Measures `corr(model_correct, resource_stressed)`. **A failure here means the
bias is real but too weak to find** — a downstream analysis correlating model
correctness against attributes wouldn't turn it up. Fix by widening the gap
between `errorRateWhenBiasOn` and `errorRateWhenBiasOff`, or increasing
`logitScale`.

### decoys-are-decoys

Measures the largest correlation between any decoy attribute (the ones with
`pathway: null`) and any pathway score. A failure means a decoy accidentally
correlates with a pathway — usually because its `valueShares` happen to align
with how the corpus was built, or a vocabulary change gave a "decoy" word real
weight. It should read `-` for requested/achieved/ceiling in the table and stay
uncorrelated with everything.

### pathways-are-orthogonal

Measures the largest off-diagonal `|r|` in the pathway x pathway correlation
matrix (section 2). **A failure here means the vocabulary weights have drifted
into correlated columns** — most likely a word ended up with non-zero weight in
more than one pathway, or the per-pathway weight sets lost their symmetric
(positive/negative) balance. This quietly undermines both bias checks above:
if the pathways aren't independent, `resource_stressed`'s correlation with the
truth or the model's correctness can no longer be attributed cleanly to
`resource_stressed` itself. `scripts/alien/config-validation.ts` is supposed to
catch the "more than one pathway" case at config-load time (section 7,
exercise 2) before it ever reaches this check.

## 5. Changing a parameter and confirming it took

Open `scripts/alien-config.ts` and find `voices_raised`'s `targetR: 0.65` (in
the `attributes` array, first entry). Change it to `0.4`:

```bash
npm run generate:alien
```

The `voices_raised` row in the attribute table changes from `requested 0.650
achieved 0.652` to:

```
  voices_raised       P0       0.400      0.400     0.717    no      65.0% 35.0%
```

— the achieved column tracks the new request, the ceiling is unchanged (it only
depends on the value shares, not `targetR`), and all eight self-checks still
print `PASS`. Now put it back:

```bash
git diff scripts/alien-config.ts    # should be empty
```

Change `targetR` back to `0.65` and rerun `npm run generate:alien` to confirm
the table returns to the section 2 numbers before moving on.

## 6. Changing the seed

Open `scripts/alien-config.ts` and change `seed: 20260803` to `seed: 42`, then:

```bash
npm run generate:alien
```

This produces a genuinely different dataset — not a cosmetic change. Excerpted
from this run (the attribute table and classification block also change, but
follow the same pattern as section 2 and are omitted here for brevity):

```
alien dataset — seed 42, 800 conversations

variance split (target -> realized)
  P0  55.0% -> 53.1%
  P1  20.0% -> 21.8%
  P2  15.0% -> 14.8%
  P3  10.0% -> 10.3%

pathway x pathway correlation
  P0  1.000   -0.036  -0.018  -0.054
  P1  -0.036  1.000   0.052   0.072
  P2  -0.018  0.052   1.000   -0.015
  P3  -0.054  0.072   -0.015  1.000

self-checks
  PASS  shap-additivity           largest deviation 2.66e-15 (limit 1.00e-9)
  PASS  note-evidence             all 800 notes attest all 9 attributes exactly once
  PASS  achieved-correlations     largest gap 0.0016 (tolerance 0.02)
  PASS  word-coverage             rarest word appears in 302 conversations (minimum 100)
  PASS  truth-is-unbiased         corr(target, resource_stressed) = 0.0066 (limit 0.08). ...
  PASS  bias-is-detectable        corr(model_correct, resource_stressed) = -0.2846 (minimum magnitude 0.2). ...
  PASS  decoys-are-decoys         largest decoy correlation 0.0783 (limit 0.15)
  PASS  pathways-are-orthogonal   largest off-diagonal |r| 0.0722 (limit 0.12)
```

Every number moved — the variance split is off by a point or two instead of
exact, the pathway correlations are larger (though still well inside the 0.12
orthogonality limit), the rarest word count changed from 291 to 302 — and yet
all eight checks still pass. That's the evidence that the checks constrain the
*construction*, not one lucky draw at the shipped seed.

Put the seed back:

```bash
git diff scripts/alien-config.ts    # should be empty
```

Change `seed` back to `20260803` and rerun `npm run generate:alien` to confirm
you're back to the section 2 numbers.

## 7. Deliberately breaking it

Two exercises, each expected to fail loudly rather than write bad data.

**Exercise 1 — request more correlation than the value split can reach.**

Change `voices_raised`'s `targetR` (same spot as section 5) to `0.95`, then:

```bash
npm run generate:alien
```

This exits with a non-zero status and no data is written for this attempt —
before the config even reaches `writeDataset`. The real error:

```
Error: Attribute "voices_raised": requested r=0.95 exceeds the ceiling r=0.717
reachable at this value distribution. A value cut from a normal latent cannot
track it more closely than that. Lower targetR, or move the shares toward an
even split, which raises the ceiling.
```

It names both the requested value (`0.95`) and the measured ceiling (`0.717`,
matching the ceiling column from section 2). Set `targetR` back to `0.65` and
confirm `git diff scripts/alien-config.ts` is empty.

**Exercise 2 — give one vocabulary word weight in a second pathway.**

Near the top of `scripts/alien-config.ts`, the `vocabulary` array is built by
`group(pathway, positives, negatives)` calls, and each word is meant to carry
weight in exactly one pathway. Temporarily add this line right after the
`vocabulary` array is assigned (after the closing `];` of the `group(3, ...)`
calls):

```ts
vocabulary[0].weights[1] = 0.1;
```

That gives `"tarrak"` (the first word in pathway 0's group) a nonzero weight in
pathway 1 too. Then:

```bash
npm run generate:alien
```

Config validation refuses it before generation starts:

```
Error: Word "tarrak" must carry weight in exactly one pathway, found 2.
Cross-pathway weight correlates the pathway scores and breaks the bias
construction.
```

Delete the line you added and confirm `git diff scripts/alien-config.ts` is
empty.

**After both exercises**, run `npm run generate:alien` once more and confirm it
prints all eight `PASS` lines and exits 0 — the config is back to what ships.

## 8. Inspecting the output files

```bash
ls dist/alien-data
```

```
index.json
shap
```

`index.json` holds all 800 reviews plus metadata (attribute definitions, the
`alien-fa-4` fit's variance and importance figures). `shap/alien-fa-4/` holds
one JSON file per two-hex-character bucket of the conversation id — 249 bucket
files on this run, since only 249 of the 256 possible two-hex prefixes are hit
across 800 ids.

Look at one conversation:

```bash
jq -r '.reviews[0].id' dist/alien-data/index.json
```

```
c04b9a49822c
```

```bash
jq '.reviews[0] | {id, text, target, target_label, attributes, pathway_scores, classification}' \
  dist/alien-data/index.json
```

Its SHAP entry lives in the bucket named by the id's first two characters
(`c0`):

```bash
jq '.reviews[] | select(.id=="c04b9a49822c")' dist/alien-data/shap/alien-fa-4/c0.json
```

Confirm `[CLS]` and `[SEP]` carry zero scores on every pathway:

```bash
jq '.reviews[] | select(.id=="c04b9a49822c") | .words[0], .words[-1]' \
  dist/alien-data/shap/alien-fa-4/c0.json
```

```json
{ "word": "[CLS]", "scores": [0, 0, 0, 0] }
{ "word": "[SEP]", "scores": [0, 0, 0, 0] }
```

Confirm the word scores plus the base value sum to the pathway score (this is
exactly what `shap-additivity` checks, for every conversation):

```bash
jq -c '
  .reviews[] | select(.id == "c04b9a49822c") |
  (.base_values as $b | ([.words[].scores] | transpose | map(add)) as $sum |
   [0,1,2,3] | map($b[.] + $sum[.]))
' dist/alien-data/shap/alien-fa-4/c0.json

jq -c '.reviews[] | select(.id=="c04b9a49822c") | .pathway_scores["alien-fa-4"]' \
  dist/alien-data/index.json
```

```
[0.00333411418287842,0.9406141886696585,-0.8217355216334421,1.1623433245621728]
[0.003334114182878423,0.9406141886696585,-0.8217355216334422,1.1623433245621728]
```

The two lines match to well within floating-point noise.

Because the seed and config are fixed, `c04b9a49822c` is the id of the first
review on any clean run of `npm run generate:alien` at the config this repo
ships — if it's different, either the config changed or something upstream
isn't deterministic.

## 9. What is not here yet

- **No UI.** This is a data-generation script; nothing in the app reads
  `dist/alien-data/` yet. Phase 5 wires it into the explorer.
- **`hidden` attributes are emitted, not acted on.** `resource_stressed`,
  `gestures_repeated`, `young_present`, and `carrying_burden` all carry
  `hidden: true` in their attribute definitions and are written into every
  review's `attributes` and note text like any other attribute — nothing in
  the generator or the explorer currently does anything different for them.
  Phase 6 is where the `hidden` flag starts to matter.
- **Notes are template-written, not LLM-generated.** `scripts/alien/notes.ts`
  defines a `NoteRenderer` interface and ships exactly one implementation,
  `TemplateNoteRenderer`, which stitches together fixed fragments from
  `scripts/alien-config.ts`. The seam exists for an LLM-backed renderer that
  reads a content-addressed cache; that renderer is not built.
- **Parameters are starting values, not tuned ones.** The variance split,
  `targetR`s, error rates, and so on in `scripts/alien-config.ts` are what the
  generator was built and validated against — tuning them for pedagogical
  effect is phase 7's job, not this one's.

---

## Known rough edges — already known, no need to report

- **Notes are visibly templated.** At 800 items built from a handful of
  fragments per attribute value, a reader who looks at more than a few notes
  will start recognizing the fragments repeat. This is expected of the
  template renderer (see section 9) and not something to file.
- **`group_size` is provisional and may be cut.** It's the one non-binary,
  six-value attribute in the set; it may not survive to later phases in its
  current form.
- **The explorer's `classification_label` wording still says positive/negative.**
  `src/explorer/components/review-panel.tsx` renders the classification badge
  as `"positive"`/`"negative"` rather than the dataset's own
  `target_label` (`"approach"`/`"wait"` in this dataset). Phase 5, which wires
  the explorer up to this data, is expected to fix the wording.
