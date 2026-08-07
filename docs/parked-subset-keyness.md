# Subset Word Keyness — Parked Idea

**Status: parked 2026-08-03.** Not built. This document exists so the idea can be picked up
in a fresh session without re-deriving the reasoning or re-running the analysis.

## Why it is parked

The tool works by letting a reader interpret words. That is fine for Yelp reviews, where the
reader knows what the words mean. It does not work on alien conversation text, which is
opaque by design.

There is a workable fix — run it on the observer's English notes instead of the conversation
(see [If it is picked up](#if-it-is-picked-up)) — but that was rejected for a pedagogical
reason, not a technical one:

> Students should be looking at word-level information **that the ML model is actually
> processing**, so they learn how text models work. Putting a second, parallel word analysis
> on screen — one over the observer's notes, which the model never sees — is likely to
> confuse rather than clarify.

That reasoning still stands. The idea is parked, not rejected; the keyness approach is
genuinely useful and would work well against the observation notes if the confusion problem
can be solved.

## What the tool is

Given a subset of reviews, show which words are **over-represented in that subset relative to
the rest of the corpus**, ranked by how strong the evidence is.

The subset comes free: the explorer's search box already selects one, and a query like
`pathway_3:>0.8` already isolates a pathway's extremes. What is missing is any way to see
those reviews **in aggregate**. Today the results panel shows text snippets to read one at a
time, and noticing that 15 of 130 reviews share something — when you do not know what you are
looking for — is not a task people do well serially.

## The problem it solves

The project's core difficulty, documented in
[data/neural-pathways-review.md](data/neural-pathways-review.md), is that pathway *discovery*
works while pathway *interpretation* mostly does not. The proposed loop out of this is:

1. Look at the reviews scoring highest on a pathway.
2. Notice a commonality you have no attribute for.
3. Code that commonality as a new attribute.
4. Check it — alone and in combination — against the pathways and the classification.

Step 2 is where this tool lives, and step 2 is where the loop had previously stalled.

### Why the loop is plausible despite Factor Analysis being variance-driven

A natural objection: FA optimizes for variance explained, so it should be blind to effects
that are large in magnitude but narrow in population — which is the shape a bias takes. The
arithmetic supports the objection. A conjunction firing for 3% of reviews and shifting 5 of
780 neurons by 2σ accounts for about **0.075%** of total activation variance. Even a gross
version — 10% of reviews, 20 neurons, 2σ — stays under 1%. Against P0's ~82%, these are noise.

But the loop does not need the pathway to *contain* the effect. It needs the pathway to
*concentrate cases for inspection*, and **the tail of a broad factor is itself a narrow,
non-random slice**. Simulating an unnamed binary feature with correlation ρ to a pathway, here
is its prevalence among the top 2% of reviews by that pathway's score:

| feature base rate | ρ=0.00 | ρ=0.10 | ρ=0.20 | ρ=0.30 | ρ=0.50 |
|---|---|---|---|---|---|
| 3% | 3.2% | 5.2% | 8.0% | 11.6% | 22.7% |
| 10% | 10.4% | 15.2% | 21.1% | 28.1% | 46.7% |

Of the ~130 reviews in a top-2% slice of 6,427: a 3% feature at ρ=0.3 appears in **15**
rather than 4. A 10% feature at ρ=0.3 appears in **37** rather than 13. That is the difference
between invisible and noticeable.

The ρ=0 column is the precondition, stated exactly: **the loop only concentrates features that
correlate with some pathway.** An orthogonal feature is never enriched, and nothing rescues
that. Several pathways give several lenses, which improves the odds without guaranteeing
anything.

## Evidence from the 2026-08-03 run

Run against the live `index.json` using fit `test-fa-7` (6,427 reviews, 7 pathways, P0 at
81.9% of variance, P1 at 5.3%, the rest under 1% each). Method: log-odds ratio with an
informative Dirichlet prior (Monroe, Colaresi & Quinn 2008), contrasting the top 2% against
the bottom 2% of each pathway. Script in the [appendix](#appendix-the-analysis-script).

### The sanity check passed

P0 came back cleanly as sentiment. High end: `not, was, didn't, never, order, half, no`. Low
end: `great, is, always, perfect, staff, friendly, best, delicious, excellent`. The method
works.

### The finding: P2 is substantially a synthetic-text detector

| | |
|---|---|
| r between P2 and `is_synthetic` | **0.546** |
| synthetic share of P2's top 2% | **88.3%** |
| synthetic share of P2's bottom 2% | **0.0%** |
| synthetic share of the corpus | 6.7% (432 of 6,427) |

P5 shows a weaker version (60.9% of its top tail synthetic); P3 and P6 show the mirror image
at their low ends. The keyness words made it legible before the correlation was checked — P2's
high end read `the, with, service, is, food, experience, staff, visit, dishes, atmosphere,
flavors`, which is GPT restaurant-review register, against `pizza, they, was, my, we, when` at
the low end, which is how people actually write.

### The confound, unresolved

**The synthetic reviews were never part of the FA fit.** `test-fa-7` was fit on the 2,998
test-split reviews; the 432 synthetic ones are only projected through it. Out-of-distribution
points landing in the tails of a projection is an ordinary artifact and produces exactly this
signature.

This cannot be disentangled with the current data, because no published fit includes the
synthetic reviews. **The test that would settle it:** refit FA on a pool that includes them
and see whether P2 survives. Until then, "the model represents synthetic-ness" and "FA
projections of unseen text land in one direction" are both live, and they mean very different
things.

### The deflation

Removing the synthetic reviews and rerunning on the 5,995 human ones, the clean register split
dissolves. P2's z-scores drop from 7–9.6 to 2–4.6 and the words become mush: `very, was,
great, the, and, restaurant` against `they, you, in, big, when`. **Most of what looked
interpretable was the artifact.** This is consistent with the earlier recollection that
inspecting English words never found anything conclusive.

### What survived

One candidate, weakly but consistently. P3 and P6 both separate the same axis among human
reviews:

- **High end:** `they, after, told, called, us, said, hour, if, who, don't, away, business` —
  a **service-incident narrative**. Someone told us something, we called, we waited an hour.
- **Low end:** `pizza, worst, ever, chicken, tasted, fries, wings` — a **food-quality
  complaint**.

Both ends are negative reviews. The distinction is not sentiment but *what went wrong* — the
staff or the food. It is nameable, it appears in two independent pathways, and there is no
attribute for it. At z ≈ 2–3 it is a hypothesis, not a finding.

**This is the case that justifies the tool.** The synthetic finding needed no new tool at all,
because `is_synthetic` is already an attribute and the phase 2 correlation matrix would show
r = 0.546 sitting there right now. The service-versus-food candidate only surfaced because of
aggregate word statistics, and that is the case the tool exists for: finding commonalities you
have no attribute for.

## If it is picked up

### The alien-language resolution

The tool's input is not "the item's text" but **the human-readable record attached to the
item**:

- **Yelp:** the review text — record and data are the same thing.
- **Alien:** the observer's note — record and data are separate.

A dataset-config field naming which property to read; the tool is otherwise unchanged. This
fits the fiction better than reading the conversation would: a qualitative researcher deciding
what to code next reads field notes, not raw recordings. It also gives phase 6's
commissioned-coding mechanic the trigger it lacks — notice a word recurring in the notes of
high-P1 conversations, commission the coding of that thing, watch it join the matrix.

**The open problem is the one that caused the parking:** two parallel word analyses on screen —
one over text the model reads, one over notes it never sees — is likely to confuse students
about what the model is actually doing. Any revival needs an answer to that, whether by
separating the two in the UI, gating them to different activities, or something else.

### Requirements this would impose on the alien generator (phase 4)

1. **Notes must carry evidence for hidden attributes.** Already required by the spec for a
   different reason — so unlocking an attribute does not reveal something the notes never
   supported. This would make it load-bearing twice.
2. **Notes must contain material that is not an attribute.** If every phrase maps to some
   attribute, keyness returns exactly the attribute list and the exercise degenerates into
   reading answers off a menu. Real coding work is partly deciding what is *not* worth coding.
3. **Template variety becomes functional, not cosmetic.** Heavily templated notes make keyness
   over them trivial — the same phrase every time.

### Open design questions

- **Metric.** Log-odds with an informative Dirichlet prior is the recommendation. Plain
  frequency ratios over-reward rare words; the prior shrinks each word toward the corpus rate
  in proportion to how little evidence supports it, and the resulting z-score is comparable
  across words of very different frequency. This is what made the run above readable.
- **Contrast target.** Subset versus whole corpus, or subset versus its complement? The most
  informative output above came from an explicit **top-tail versus bottom-tail** contrast, not
  from subset-versus-corpus. That suggests the primitive should be two subsets, with
  "everything else" as the default second one.
- **Where it lives.** Explore view, Correlations view, or its own mode.
- **How the subset is chosen.** Search results only, or also a matrix cell's group, or a
  pathway-tail control that does not require typing a query.
- **What is displayed.** Over-represented words only, or both ends? Are words clickable to
  add to the search?
- **Small vocabularies.** Behaviour against a ~40-word alien vocabulary versus 30k English is
  very different and needs thought — with 40 words the whole vocabulary fits on screen.

## Related parked idea: attribute-combination search

Raised in the same conversation and also deferred. Sketched here so it is not lost.

**The idea:** rather than correlating one attribute at a time against a pathway, evaluate
*combinations* of attribute values — `voices_raised=1 AND group≥3=0 AND food_present=1` — and
report which combinations mark out pockets of unusual pathway scores. This is the shape real
bias usually takes: a classifier can look fair on every attribute measured separately while
being badly unfair on a conjunction of them (the Gender Shades result; formally, "fairness
gerrymandering"). The established name for the technique is **subgroup discovery**.

**It is cheap to compute, not brute force.** A combination is a binary indicator, so its
relationship to a pathway is a point-biserial correlation, which has a closed form needing
only the subset's count and the sum of pathway scores within it:

```
r = (mean_in − mean_out) · √(p(1−p)) / sd_pop        where p = n_subset / n
```

(verified against a direct Pearson computation to 1e-12). One pass builds a cross-tabulation
cube of `(count, sum)` per fully-specified cell; every combination at every order is then a
roll-up of cube cells. For the five Yelp attributes that is 288 cells and 1,349 total
conjunctions — sub-millisecond. The count is `∏(levels+1) − 1`, which only becomes a problem
past roughly 15 attributes.

Useful property: `r` **self-damps for small subsets** because of the `√(p(1−p))` factor. A
subset of 3 reviews cannot exceed |r| ≈ 0.07 even with a 3σ shift, so tiny cells cannot
out-rank real findings. A minimum-support floor is still wanted, but the metric is not
fighting you.

**Why it was deferred:** phase 3's regression panel already fits all pairwise interaction
terms, so a two-way interaction between binary attributes is already visible there. The
combination search only becomes *necessary* for three-way and higher conjunctions, for
value-level combinations on multi-level attributes, or for the **subgroup framing** — "these
200 reviews have triple the error rate" is concrete and inspectable in a way that a β of 0.21
on `X × Y` is not. The pedagogical case is stronger than the statistical one. The plan was to
run an activity using phase 3's interaction terms first and build this only if the regression
table proves too abstract for students.

**Visualization sketch**, since that was the hard part: a support-versus-effect scatter (x =
subset size on a log scale, y = mean shift in σ, one point per combination, `r` as contour
lines) as the overview, plus a lattice tree that expands a combination only when it beats its
best parent — which prunes the redundancy that otherwise fills a top-20 list with twenty
restatements of one finding.

## Appendix: the analysis script

Standalone Node, no dependencies. Expects `index.json` fetched from
`https://models-resources.s3.amazonaws.com/neural-pathways/data/v1/index.json` in the same
directory. Run as `node keyness.js test-fa-7 0.02`.

```js
// Which words distinguish the reviews at the top of a pathway from those at the bottom?
//
// Method: Monroe, Colaresi & Quinn (2008) log-odds-ratio with an informative
// Dirichlet prior. Plain frequency ratios over-reward rare words; this shrinks each
// word toward the corpus rate in proportion to how little evidence there is for it,
// and the resulting z-score is comparable across words of very different frequency.

const data = require("./index.json");

const FIT = process.argv[2] || "test-fa-7";
const TAIL = Number(process.argv[3] || 0.02);   // fraction taken from each end
const MIN_CORPUS_COUNT = 25;                     // ignore words too rare to judge
const TOP_WORDS = 12;

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(w => w.length > 1);
}

const reviews = data.reviews.filter(r => Array.isArray(r.pathway_scores[FIT]));
const nPathways = data.metadata.fa_fits[FIT].n_pathways;
const tokens = reviews.map(r => tokenize(r.text));

const corpus = new Map();
for (const doc of tokens) {
  for (const w of doc) corpus.set(w, (corpus.get(w) || 0) + 1);
}
const vocab = [...corpus.entries()].filter(([, c]) => c >= MIN_CORPUS_COUNT).map(([w]) => w);
const corpusTotal = vocab.reduce((s, w) => s + corpus.get(w), 0);

const ALPHA_0 = 1000;   // total prior pseudo-counts, spread by corpus rate
const alpha = new Map(vocab.map(w => [w, (corpus.get(w) / corpusTotal) * ALPHA_0]));

function countsFor(indices) {
  const counts = new Map();
  let total = 0;
  for (const i of indices) {
    for (const w of tokens[i]) {
      if (!alpha.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
      total++;
    }
  }
  return { counts, total };
}

function keyness(groupA, groupB) {
  const a = countsFor(groupA);
  const b = countsFor(groupB);
  const scored = [];
  for (const w of vocab) {
    const aw = a.counts.get(w) || 0;
    const bw = b.counts.get(w) || 0;
    if (aw + bw === 0) continue;
    const pa = alpha.get(w);
    const oddsA = Math.log((aw + pa) / (a.total + ALPHA_0 - aw - pa));
    const oddsB = Math.log((bw + pa) / (b.total + ALPHA_0 - bw - pa));
    const delta = oddsA - oddsB;
    const variance = 1 / (aw + pa) + 1 / (bw + pa);
    scored.push({ word: w, z: delta / Math.sqrt(variance), aw, bw });
  }
  scored.sort((x, y) => y.z - x.z);
  return scored;
}

console.log(`fit ${FIT} — ${reviews.length} reviews, ${vocab.length} words kept `
  + `(>=${MIN_CORPUS_COUNT} uses), tails at ${(TAIL * 100).toFixed(0)}%\n`);

for (let p = 0; p < nPathways; p++) {
  const order = reviews.map((r, i) => [r.pathway_scores[FIT][p], i]).sort((x, y) => x[0] - y[0]);
  const k = Math.max(1, Math.floor(order.length * TAIL));
  const low = order.slice(0, k).map(e => e[1]);
  const high = order.slice(-k).map(e => e[1]);

  const scored = keyness(high, low);
  const top = scored.slice(0, TOP_WORDS);
  const bottom = scored.slice(-TOP_WORDS).reverse();

  const varPct = (data.metadata.fa_fits[FIT].explained_variance_per_pathway[p] * 100).toFixed(1);
  console.log(`P${p}  (${varPct}% of variance, ${k} reviews per tail)`);
  console.log(`  HIGH end: ${top.map(t => `${t.word}(${t.z.toFixed(1)})`).join("  ")}`);
  console.log(`  LOW  end: ${bottom.map(t => `${t.word}(${(-t.z).toFixed(1)})`).join("  ")}`);
  console.log();
}
```

To reproduce the human-only rerun, filter `reviews` with
`!("synthetic-gpt" in r.sources)` before tokenizing.

## Related documents

- [data/neural-pathways-review.md](data/neural-pathways-review.md) — why interpretation
  mostly failed, which is the problem this idea addresses.
- [superpowers/specs/2026-07-30-attributes-and-alien-dataset-overview.md](superpowers/specs/2026-07-30-attributes-and-alien-dataset-overview.md)
  — the big-picture spec, including the build order this would slot into and the phase 6
  commissioned-coding mechanic.
- [curriculum-ideas.md](curriculum-ideas.md) — the "why ask why?" framing and the 145
  misclassified reviews.
- [testing-correlations-view.md](testing-correlations-view.md) — what phases 2 and 3 built,
  which this would sit alongside.
