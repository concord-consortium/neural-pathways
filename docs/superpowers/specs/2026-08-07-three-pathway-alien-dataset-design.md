# Three-pathway alien dataset

## Why

The alien dataset has four pathways. Four was a starting guess, chosen because more
pathways seemed likely to make the variance and orthogonality constraints easier to
satisfy, not because the activity needs four. The open question is how few pathways
the activity can run on and still be compelling.

This adds a second dataset with three pathways and keeps the four-pathway one, so the
two can be compared side by side. It is an experiment, not a replacement: nothing about
the existing dataset changes except its dropdown label.

## What the three-pathway dataset is

Two of the four pathway roles are load-bearing and cannot be cut. P0 carries the truth
(`voices_raised`), and the last pathway carries the planted bias (`resource_stressed`,
hidden until commissioned). The choice is what happens to the two middle pathways, and
the answer here is that `engaged_in_task` keeps a pathway and `group_size` does not.

| | attribute | targetR | |
|---|---|---|---|
| P0 | `voices_raised` | 0.65 | truth pathway |
| P1 | `engaged_in_task` | 0.35 | |
| P2 | `resource_stressed` | 0.65 | the planted bias, hidden |
| — | `group_size` | 0 | demoted to a decoy |

`group_size` stays in the dataset as the only non-binary attribute, so the fields and
correlations views still have an integer attribute to render. It simply tracks no
pathway.

### Vocabulary: thirty words

The four ten-word groups map to pathways one for one, so one group has to go. The group
that fed `group_size`'s pathway is dropped, and the fourth group moves from P3 to P2
carrying its words with it.

That last part is deliberate. The activity's pivotal step is filtering to high scores on
the bias pathway and reading the words that turn up. Keeping the same ten words on that
pathway in both datasets makes that step read identically, so a comparison between the
two isolates the pathway count rather than confounding it with a vocabulary change.

The word groups carry no meaning — nothing in the generator or the config defines what
any alien word means, and the meaning a reader infers is emergent from the notes. The
groups are therefore named by index, not by the attribute they happen to sit beside.

### Variance split: 55 / 35 / 10

P0 and the bias pathway hold their four-pathway values exactly; the dropped pathway's
15% goes to P1. One number moves instead of two.

The alternative considered was reusing the three existing `SCALE` entries unchanged,
which lands near 65 / 24 / 12 and lets P0 absorb the freed variance. That is arguably a
more natural profile for a three-factor fit, but it shifts both P0 and the bias pathway
away from their four-pathway values, which muddies the comparison this dataset exists to
support.

`SCALE` has to be re-solved. The existing `[1.0, 0.7912, 0.7308, 0.6546]` was solved
numerically for the 55/20/15/10 split, and as the comment there records there is no
closed form: the word-selection tilt is itself proportional to the weight, so variance
rises faster than `scale^2`. The solve is a fixed-point iteration — generate, read the
realized shares from the summary, rescale, repeat — run from a throwaway script that
does not ship. The converged constants are pasted into the config with a comment
matching the existing one.

Note that `targetVarianceShares` is reported against, not asserted: no self-check fails
if the realized shares miss their target. The tuning is for realism and for the summary
being trustworthy, not to satisfy a gate.

### Difficulty is deliberately not compensated

With three pathways instead of four, a student correlating pathways against
`model_correct` has one fewer column to work through before the bias pathway turns up.
That makes the activity marginally easier.

This is left uncorrected. Measuring whether three pathways is *too* easy is the reason
the dataset is being built, so the bias pathway stays at 10% of the variance and the
comparison answers the question rather than the tuning pre-empting it.

### Seed

The seed stays `20260803`. A different `pathwayCount` draws a different number of
normals per conversation, so the RNG stream diverges from the first item regardless —
the two corpora share no text either way. A second seed constant would imply a control
that does not exist.

## How the two configs share code

The two configs differ in about eight values. Everything else is identical, including
the nine attributes and their roughly 240 lines of note fragments. Duplicating those
would be actively unsafe: `checkFragmentsAreDistinguishable` runs per-config, so two
copies of the notes could drift apart and no check would catch it.

The bulky shared material moves to `scripts/alien/config-common.ts`:

- `MAGNITUDES`, and `WORD_GROUPS` — the four ten-word groups as an array, named by index
- `groupBuilder(scale)` — the existing `group()` helper, closed over a per-config `SCALE`
- `BASE_ATTRIBUTES: Omit<AttributeConfig, "pathway" | "targetR">[]` — the nine attributes
  with everything except their pathway assignment. Omitting those two fields from the
  type makes it impossible for a config to inherit an assignment by accident.
- `withPathwayAssignments(base, assignments)` — throws if any base attribute is
  unassigned, or if an assignment names a key that is not in the base. That
  exhaustiveness is the point: a tenth attribute added later forces both datasets to
  state where it goes rather than one of them silently defaulting.
- `FILLER_FRAGMENTS`, `THRESHOLDS`

The threshold values are the same for both datasets, but `decoyMax`'s comment currently
justifies itself by counting the comparisons it judges — 24, being six decoys against
four pathways. Shared, it judges 24 in one dataset and 18 in the other (six decoys, now
including `group_size`, against three pathways), so the comment is reworded to explain
the reasoning without asserting a single count.

Each config restates its own scalars — `seed`, `conversationCount`, the turn and word
ranges, the error rates — rather than inheriting them by spread. They are one line each,
they are meant to be independently settable per dataset, and a config file whose job is
to be read should not send the reader to a second file to learn its seed.

The result is that the whole difference between the datasets is visible at a glance:

```ts
// four pathways
const SCALE = [1.0, 0.7912, 0.7308, 0.6546];
const group = groupBuilder(SCALE);
const vocabulary = [
  ...group(0, WORD_GROUPS[0]), ...group(1, WORD_GROUPS[1]),
  ...group(2, WORD_GROUPS[2]), ...group(3, WORD_GROUPS[3]),
];
const attributes = withPathwayAssignments(BASE_ATTRIBUTES, {
  voices_raised:     { pathway: 0,    targetR: 0.65 },
  engaged_in_task:   { pathway: 1,    targetR: 0.35 },
  group_size:        { pathway: 2,    targetR: 0.15 },
  resource_stressed: { pathway: 3,    targetR: 0.65 },
  near_water:        { pathway: null, targetR: 0 },
  // ...and four more decoys
});

// three pathways — differs in exactly these lines
const SCALE = [1.0, <solved>, <solved>];
const vocabulary = [
  ...group(0, WORD_GROUPS[0]), ...group(1, WORD_GROUPS[1]),
  ...group(2, WORD_GROUPS[3]),   // the fourth group keeps its words, moves to P2
];
  group_size:        { pathway: null, targetR: 0 },
  resource_stressed: { pathway: 2,    targetR: 0.65 },
```

Once the bulk is extracted each config is about sixty lines, so both live side by side
in `scripts/alien-config.ts`. That is what you want when the point of the exercise is
comparing them.

The exports are renamed symmetrically to `fourPathwayConfig` and `threePathwayConfig`,
with `alienConfigs = [fourPathwayConfig, threePathwayConfig]` for the generator to loop
over. Keeping the existing `alienConfig` name for one of them would privilege it and
leave a reader guessing which one it meant; the rename costs a handful of mechanical
import edits that the compiler points straight at.

The generator pipeline modules need no changes at all. `pipeline`, `conversations`,
`attributes`, `outcomes`, `emit`, `checks` and `config-validation` are already written
against `config.pathwayCount`, and the app reads `n_pathways` from the emitted metadata
rather than hardcoding a count.

## Wiring

Names: id `alien3`, label `Alien Conversations (3 pathways)`, `outputDir`
`dist/alien-data-3`, `baseUrl` `alien-data-3/`, `fitName` `alien-fa-3`, `reviewSetName`
`alien3`.

**Generator entry.** `scripts/generate-alien-data.ts` loops over `alienConfigs`, printing
a header before each dataset's summary. Every dataset is still written even when its
checks fail — the existing "inspect it, do not ship it" behaviour — and the process exits
1 if any dataset failed.

**App.** A `createAlienDataset({ id, label, baseUrl })` factory in
`src/shared/datasets/alien-dataset.ts` exports both `alienDataset` and `alien3Dataset`.
The two differ only in those three fields; the derived attributes, the classification
labels, the item noun and `getAttributeValue` are shared. `registry.ts` gains the third
entry. Yelp stays the default dataset.

**Existing label.** `alienDataset`'s label becomes `Alien Conversations (4 pathways)` so
the dropdown reads symmetrically. Its id stays `alien`, so deployed URLs, the
`#dataset=alien` links and the Playwright specs are unaffected.

**Build.** Webpack's `cleanOnceBeforeBuildPatterns` gains `'!alien-data-3'` and
`'!alien-data-3/**'` alongside the existing exclusion. Without it the build deletes the
data the `prestart`/`build` hook just generated. `src/index.html` gains a second Alien
Explorer link, and its existing link is relabelled to name its pathway count.

## Testing

- Rename `alienConfig` to `fourPathwayConfig` across the five `scripts/alien/*.test.ts`
  files that import it.
- `config-validation.test.ts` asserts `validateConfig` passes for both configs.
- New unit tests for `withPathwayAssignments`: it throws when a base attribute has no
  assignment, and when an assignment names an unknown key.
- A test pinning the three-pathway roles: `pathwayCount` is 3, the bias attribute tracks
  P2, `group_size` is a decoy, and the vocabulary is thirty words each carrying three
  weights. These are the facts that would otherwise rot silently.
- `registry.test.ts` expects `["alien", "alien3", "yelp"]`.
- `alien-dataset.test.ts` covers `alien3Dataset`'s id and base URL, and that both configs
  resolve the same attribute set.

The existing generator unit tests are deliberately **not** parameterized over both
configs. Several assert four-pathway specifics, and the real correctness gate for the new
data is the eight self-checks — SHAP additivity, note evidence, achieved correlations,
word coverage, truth-is-unbiased, bias-is-detectable, decoys-are-decoys,
pathways-are-orthogonal — which run against the three-pathway data every time it is
generated.

Manual verification is the existing walkthrough plus a new section: the three-pathway
dataset loads, the search help offers `pathway_0` through `pathway_2`, and the bias shows
up on P2 in the correlations view.

## Documentation

`docs/testing-alien-generator.md` and `docs/testing-alien-explorer.md` need their expected
generator console output updated, since the command now emits two datasets. The explorer
walkthrough gains a short three-pathway section. The walkthroughs that quote the dropdown
label verbatim — `testing-alien-explorer.md` and `testing-attribute-commissioning.md` —
need the label updated to match the rename.

## Out of scope

- The default dataset stays Yelp.
- No retune of the four-pathway dataset. Its seed, scales, attributes and thresholds are
  untouched; only its label changes.
- No changes to the generator pipeline modules.
- No attempt to equalize activity difficulty between the two datasets — see above.
