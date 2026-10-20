# A Network Fitted to the alien3 Data — Design

## Overview

Trace a Case and Extract Pathways draw a stand-in network, `toyNetwork`, and Extract Pathways draws
the prototype's stand-in loadings. Neither matches the alien3 data: the toy network computes its
own hidden values, and the generator's 14 activations come from pathway scores, loadings and random
noise, not from any weights.

This story has the generator fit a network to the alien3 data on every build, and switches both
views to it and to the dataset's real loadings. The network keeps today's shape, 10 → 8 → 6 → 2. Its
8 + 6 hidden units approximate the 14 authored activations, and its outputs reproduce the dataset's
`classification` for all 800 conversations. The dataset itself doesn't change.

Jira: [NPW-34](https://concord-consortium.atlassian.net/browse/NPW-34). Two documents came out of
the design work. [docs/factor-analysis-dependent-neurons.md](../../factor-analysis-dependent-neurons.md)
is in its own PR, which this branch builds on. The layout options for a network that generates the
activations are parked in draft
[PR #48](https://github.com/concord-consortium/neural-pathways/pull/48), which builds on this one.

The work is one PR (see [PR](#pr)).

## Why approximate, not generate

The story suggests the opposite direction: fit the network, then emit the network's own values as
the activations, so the pathways come from exactly what the views draw. The design work found that
this can't be done with today's shape:

- Factor analysis recovers the authored pathways only from neurons whose variation is their own.
  Hidden Layer 2 is computed from Hidden Layer 1, so its variation is copied, and including both
  layers in the fit blends the pathways. In tests, adding even 2 second-layer neurons to a fit that
  passed broke it.
- The pathway layer needs 3 + n inputs for n neurons, so each has a source of variation of its
  own. Today's 10 inputs can't support 8, let alone 14.
- The smallest workable pathway layer is about 10 neurons, fed by 13 inputs. Drawing that needs a
  different diagram; the layout options show the choices.

Approximation, by contrast, works with today's shape and today's diagram. A student sees signs,
rankings, tercile bands, gauges and loading bars, not exact values. A network that tracks each
authored neuron closely keeps all of those consistent with the loadings, so no view a student uses
can show the mismatch. Only refitting factor analysis on the network's own activations would.

Making the network generate the data is a follow-up story, NPW-70 (see [Follow-up](#follow-up)).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| What is authoritative | The generated dataset, unchanged: its activations, loadings, pathway scores and classifications. The network approximates them. | See [Why approximate, not generate](#why-approximate-not-generate). |
| Network shape | Words → 10 → 8 → 6 → 2, tanh hidden layers, linear outputs indexed by class (0 wait, 1 approach), as the toy network. | Keeps the diagram, the layout and both views' timelines as they are. |
| Which neuron each hidden unit tracks | Hidden Layer 1's 8 units track authored neurons 0–7; Hidden Layer 2's 6 track 8–13. | The order Extract Pathways' lifted column and the prototype's loadings already use. |
| Input | Word counts: a word used three times feeds 3. | Pathway scores add up every occurrence of a word. In the probe, with counts, the hidden units reach r 0.91–0.98 against their neurons; with presence, 0.83–0.88. The input layer isn't drawn, so nothing visible changes. |
| Where the network is fitted | In the generator, on every build. | The network can never drift from the data it approximates: a config or seed change refits it. |
| Fitting time | About 2.4 s, on top of today's ~2 s generation. | Early stopping, a classification weight of 0.5 and a seed chosen to settle quickly. An epoch cap bounds the worst case. The larger target scale below costs about a second more than 0.3 would. |
| How exactly the classification must match | All 800 conversations, each by a logit margin of at least 0.1. | Step 4 must give the dataset's prediction. Without a margin, a conversation just on the right side could flip between Node and a browser, whose `Math.tanh` may differ in the last bit. |
| How closely the activations must match | Every hidden unit correlates with its authored neuron at r ≥ 0.85. | Each neuron's random noise isn't a function of the words, which caps any word-fed unit at r 0.92–0.99 (the square root of its communality). 0.85 keeps signs, rankings and bands; the shipped network's units reach 0.87–0.95. |
| How large the hidden activations are | `targetScale` 0.75: a typical conversation fills a hidden gauge about halfway (median 46% in Hidden Layer 1, 53% in Hidden Layer 2). | The diagram draws hidden values unscaled. At 0.3 the median gauge was about 20% full, and most hidden nodes looked nearly empty. 0.75 costs about a second of fitting and lowers the weakest unit's r from 0.88 to 0.87. |
| Where the network goes | `metadata.network` in alien3's `index.json`. | The views already load it, so the network arrives with the data it was fitted to. About 10 KB. |
| Which datasets get a network | alien3 only, by an opt-in config field. | Only alien3 has views that draw a network. |
| The story's word-hover check | Doesn't apply. | The story asks that hovering a neuron shows it driven by words that fit its pathway. The words → input layer is undrawn and stays a black box; nothing in either view attributes a neuron to words. |
| PRs | One. | Two PRs would need a temporary `input: "presence" \| "counts"` field so the toy network kept working between them. |

## The generator

### Config

`AlienConfig` gains an optional field. Only `threePathwayConfig` sets it.

```ts
export interface NetworkConfig {
  /** Seeds the network's own RNG, so fitting never shifts any value drawn before it. */
  seed: number;
  /** Hidden layer sizes. The first is the undrawn embedding; the rest track the authored neurons in order. */
  hiddenSizes: number[];
  /** Hidden-unit targets are this times the authored standardized activation, inside tanh's range. */
  targetScale: number;
  activationWeight: number;
  classificationWeight: number;
  learningRate: number;
  /** Fitting stops at the first check where every classification clears this logit margin. */
  margin: number;
  /** Epochs between those checks. maxEpochs must be a multiple of it. */
  checkEvery: number;
  /** Fitting stops here whatever the margins; network-reproduces-classification then fails. */
  maxEpochs: number;
}

network?: NetworkConfig;
```

alien3's values: `hiddenSizes: [10, 8, 6]`, `targetScale: 0.75`, `activationWeight: 5`,
`classificationWeight: 0.5`, `learningRate: 0.01`, `margin: 0.1`, `checkEvery: 50`,
`maxEpochs: 6000`, and a `seed` chosen during implementation as the first that passes both checks
quickly.

`THRESHOLDS` gains `networkTrackingMin: 0.85`.

`validateConfig` adds: `hiddenSizes` holds an embedding and at least one tracking layer, each a
positive whole number, and the tracking layers' sizes add up to `activations.neuronCount`;
`targetScale` lies strictly between 0 and 1; every weight and the learning rate are positive;
`margin` is not negative; `checkEvery` and `maxEpochs` are positive whole numbers, and `maxEpochs` is
a multiple of `checkEvery`, so the last epoch is a check; `networkTrackingMin` lies in (0, 1].

### The stage: `generator/alien/network.ts`

```ts
export interface NetworkFitInput {
  vocabulary: string[];
  texts: string[];
  targets: number[][];
  classification: number[];
}

export interface FittedNetwork {
  network: Network;
  /** The epoch fitting stopped at, and whether the margin or the cap stopped it. */
  epochs: number;
  stoppedBy: "margin" | "cap";
  smallestMargin: number;
  fitMs: number;
}

export function fitNetwork(input: NetworkFitInput, config: NetworkConfig): FittedNetwork;
```

It takes only what it fits to, so its tests can run it on a few made-up conversations.

- **Placement:** last in `generate`, after `buildDataset`, and only when `config.network` is set.
  `GeneratorRun` gains `network?: FittedNetwork`. It draws only from `createRng(config.network.seed)`,
  so the dataset is identical, value for value, to what the generator emits today.
- **Inputs:** the vocabulary sorted alphabetically, and each conversation's emitted text encoded by
  the same function the forward pass uses (see [The forward pass](#the-forward-pass)), so fitting
  and the app see the same numbers.
- **Targets:** `targetScale` times `activations.standardized`. Hidden layer *k* after the embedding
  tracks the next `hiddenSizes[k]` neurons.
- **Initialization:** weights normal with standard deviation 1/√(fan-in), biases 0.
- **Loss:** `activationWeight` × the mean squared error of the tracking units, averaged over the
  neurons, plus `classificationWeight` × the softmax cross-entropy against `classification`.
- **Optimizer:** full-batch Adam (β₁ 0.9, β₂ 0.999, ε 10⁻⁸), in flat `Float64Array`s with nothing
  allocated per conversation.
- **Stopping:** every `checkEvery` epochs, run the forward pass; stop when every conversation's
  logit for its `classification` beats the other by at least `margin`, or at `maxEpochs`.
- **Output:** a `Network` in the app's shape, which `forward()` runs on word counts (see
  [The forward pass](#the-forward-pass)).

The probe this is based on is described in [Fitting probe](#fitting-probe).

### Emitting

`buildDataset` stays as it is. `generate` sets `dataset.index.metadata.network` to the fitted
`Network` when it fits one, and `writeDataset` writes it with the rest of `index.json`, numbers at
full precision. `IndexWire`'s metadata is `S3Index["metadata"]`, so it gains the optional field
with the app's type.

### Two new checks

Both run only when `config.network` is set, so the four-pathway dataset keeps its nine. Both run
on `JSON.parse(JSON.stringify(network))`, the weights exactly as emitted, through the app's
`forward()` on the emitted texts.

- **`network-reproduces-classification`:** every conversation's logit for its `classification`
  beats the other by at least `margin`. Detail: the smallest margin and, on failure, how many
  conversations fall short and the first few ids, plus whether fitting stopped at the cap, with a
  hint to try another `network.seed`.
- **`network-tracks-activations`:** each tracking unit's activations across the corpus correlate
  with its authored neuron's standardized activations at r ≥ `networkTrackingMin`. Detail: the
  smallest r, which unit it is, and, on failure, every unit below the line.

A failure fails the build, as the existing checks do (`process.exitCode = 1`). That makes CI check
all 800 classifications on every build with no Jest test reading `dist/`, which settles the open
question in the story's comment about what such a test should do when the data hasn't been
generated.

### Summary

`formatSummary` adds a `network` block after `activations`: the shape, the epochs and what stopped
fitting, the fitting time, and the smallest margin. The check-name column widens from 26 to 34
characters to fit the new checks' names.

## The app

### The network type

```ts
export interface Network {
  vocabulary: readonly string[];
  layers: readonly NetworkLayer[];
}
```

The type doesn't change. The behavior of `forward()` does.

### The forward pass

`forward(network, text)` feeds each vocabulary word's count instead of 0 or 1. The counting is its
own export, which the generator's fitting also uses:

```ts
/** How many times each vocabulary word appears in `text`, in vocabulary order. */
export function wordCounts(vocabulary: readonly string[], text: string): number[];
```

`ForwardPass.input`'s comment changes from "0/1 word presence" to word counts.

### The data

`S3Index.metadata` gains `network?: Network`. Two accessors next to `alien3Dataset`:

```ts
/** The network the generator fitted to this index. Throws if the index has none. */
export function alien3Network(index: S3Index): Network;
/**
 * The alien3 factor-analysis fit's loadings as [neuron][pathway]. Throws unless the index has
 * exactly one factor-analysis fit, with a full matrix of loadings.
 */
export function alien3Loadings(index: S3Index): number[][];
```

Each throws an error naming what is missing and saying to run `npm run generate:alien`. Both views
read them when the index is ready, on every mount, so data without a network shows the view's alert
("The conversations could not be shown: …") rather than breaking the page. A check in
`useDatasetIndex`'s `onLoaded` would miss a second mount, which starts on the cached index.

### Trace a Case

- The network comes from `alien3Network(index)` instead of `toyNetwork`.
- `COLUMN_SIZES` and `TIMELINE` stop being module constants. They are derived from the network
  inside the body, memoized on it. The sizes are still 10, 8, 6, 2.

### Extract Pathways

- The network comes from `alien3Network(index)`, and `COLUMN_SIZES` moves into the body, as in
  Trace a Case.
- `LOADINGS` and `LOADING_MAX` stop being constants in `pathways-layout.ts`:
  - `barLength(loading, max)`, `barLengths(loadings)` and `pathwaysLayout(geometry, size, loadings)`
    take the loadings or their largest |loading|, which `loadingMax(loadings)` computes;
  - so do their callers: `particlePlan(loadings)` and `landedCounts(loadings, t)` in `particles.ts`,
    `copyLeaves(neuron, neurons)` and `extractPathwaysSceneAt` in `pathways-timeline.ts`,
    `finishedPathways` and `pathwaysRestScene` in `extract-scene.ts`, `extractTimeline`, and
    `ExtractDrawing`'s and `ParticleCanvas`' props;
  - `PATHWAYS` stays a constant, 3, since the view's timing and boxes are drawn for three, and the
    loadings are checked against it.
- `checkLoadingsShape(loadings, neurons)` throws if the loadings don't have a row per lifted neuron,
  each `PATHWAYS` long. `pathwaysLayout` calls it, and so does the view when it reads the index, so
  loadings of the wrong shape show the alert. Today's comment says the rows and the neurons must
  match; the check enforces it.
- The drawing's description is unchanged: it counts the lifted neurons from the network, and says
  three pathways, which `PATHWAYS` and the loadings check keep true.

### Unchanged

The diagram, `networkScales`, `indexPasses` (it caches by network object, which is stable for the
life of a loaded index), the layout, the steps and their timelines. The edges' colors and widths
change, because the weights do.

### Removed

`toy-network.ts` and `toy-network.test.ts`, the stand-in `LOADINGS`, and the prototype's expected
passes in the conversations fixture with the test that checked the toy network against them. The
fixture is renamed `alien3-conversations.json`.

## Tests

### Jest: the generator

- `fitNetwork` on a small fixture (a few words, a handful of conversations): it reaches its
  targets and its classifications, and the same seed gives identical weights.
- Early stopping: it stops at the first check where every conversation clears the margin (fitting
  one check fewer hits the cap), and reports `"cap"` when `maxEpochs` runs out first.
- Each new check can fail, on the shipped run changed around its network: with one
  classification flipped, with the margin raised past every conversation's, and with the
  activations reversed across conversations, each reports the failure it should. Each fails 0.001
  above the value it measures and passes 0.001 below. A run that hit the cap gets the seed hint.
- The checks read the network from the dataset's `metadata.network`, so a dataset with no network
  fails both.
- `generate` with and without `network` set produces identical datasets, apart from
  `metadata.network`, which only the first has.
- `validateConfig` refuses tracking sizes that don't add up to `neuronCount`, and each other new
  rule, by its exact message.
- The four-pathway config still runs nine checks; alien3 runs eleven.

### Jest: the app

- `wordCounts` and `forward()`: a repeated word feeds its count; words outside the vocabulary are
  ignored.
- `alien3Network` and `alien3Loadings`: they read an index's network and transposed loadings, and
  throw the named error when either is missing.
- `pathwaysLayout`, `barLength` and `barLengths` with loadings passed in, including the row-count
  check and loadings with the wrong number of pathways.
- The tests switch from `toyNetwork` to a fixture network: a snapshot of the network and fit one
  generation emitted, in `src/core/network/__fixtures__/`. The 20 fixture conversations are alien3
  conversations, so the snapshot classifies every one by the margin. The toy weights can't be the
  fixture: on word counts they misclassify 7 of the 20. A generator test compares the snapshot with
  what the generator emits, so it can't fall behind.
- Both views show the load-error alert for an index without a network.

### The build

The two checks, on every build, including CI's.

### Manual, once, before the PR

Open a few conversations in Trace a Case here and in the main build: Step 4 gives the same
prediction. In Extract Pathways, the loading bars are the dataset's, and the lifted column's
activations look plausible against them: a neuron with a large bar on a pathway is strongly lit, in
that bar's direction, on conversations that score high on it.

## Docs

- [docs/alien-activations.md](../../alien-activations.md): a section on the fitted network: what it
  approximates and how closely, the two checks, why its own activations are not expected to give
  back the pathways. It says in plain words that generating the activations from the network isn't
  built yet.
- [docs/testing-alien-generator.md](../../testing-alien-generator.md): the eleven checks for alien3,
  the two new ones described in its checks section, and the `network` summary block.
- [docs/glossary.md](../../glossary.md): the entries below.
- Trace a Case's and Extract Pathways' READMEs: where the network and the loadings come from.
  Extract Pathways' README stops calling them stand-ins.

### Glossary entries

Under a new heading, "The fitted network":

- **authored activations:** the 14 per-neuron activations the generator builds from pathway scores,
  loadings and noise (`activations.standardized`, and `activations.raw` on the wire). Built so that
  factor analysis on them gives back the authored pathways.
- **fitted network:** the network the generator fits to approximate the authored activations and
  reproduce `classification` (`fitNetwork`, `metadata.network`, `alien3Network`). It is fitted,
  not trained: it reproduces these 800 conversations, with nothing held out.
- **fit:** two kinds, so say which where both could be meant: a **factor-analysis fit**, one entry
  of `fa_fits`, whose loadings and pathway scores the views show; and the fitted network.
- **tracking unit:** a hidden unit after the embedding, fitted toward one authored neuron. Hidden
  Layer 1's unit *u* tracks neuron *u*; Hidden Layer 2's unit *u* tracks neuron 8 + *u*.
- **noise ceiling:** the most a word-fed unit can correlate with its authored neuron, √(1 − its
  noise variance).
- **margin:** how far a conversation's logit for its classification beats the other's.

## Where things live

Nothing in this story is view state: no saved fields change, and nothing new survives a reload.

| Thing | Written by | Read by | Lifetime |
|---|---|---|---|
| The network's weights | `fitNetwork`, at build | `alien3Network`, then both views | One generation; reloaded with `index.json` |
| The loadings | `buildActivations`, at build (unchanged) | `alien3Loadings`, then Extract Pathways | Same |
| The forward passes and scales | `indexPasses`, on first view mount | Both views | Cached per network object and index, for the page's life |

## Fitting probe

A throwaway TypeScript probe fitted words → 10 → 8 → 6 → 2 on alien3 with full-batch Adam:

| Input | Stopping | Classification weight | Classifications | Tracking r | Time |
|---|---|---|---|---|---|
| Presence | 8,000 epochs | 0.2 | 800/800 | 0.83–0.88 | 22 s |
| Counts | 8,000 epochs | 0.2 | 800/800 | 0.91–0.98 | 22 s |
| Counts | At a 0.1 margin | 0.2 | 800/800 | weakest 0.905–0.908 | 3.4–6.9 s |
| Counts | At a 0.1 margin | 0.5 | 800/800 | weakest 0.877–0.894 | 1.4–3.2 s |

All rows use an activation weight of 5. Noise ceilings: 0.92–0.99. The first two rows are one seed
each; the last two give the range over three seeds. Time depends on the seed, so the chosen seed
sets the build's cost. The tracking units settle within about 500 epochs; the rest
of the fitting goes to the few conversations whose classification depends on `resource_stressed`,
which the words don't carry and the network has to memorize.

## PR

One PR, with commits in this order: the forward pass on word counts; the network config;
`fitNetwork`; emitting and the summary; the checks; the fixture snapshot and the accessors; both
views on the fitted network, removing the toy network; Extract Pathways' loadings; docs. The
forward pass switches first, so the checks and the fitting run the same arithmetic as the app.

## Follow-up

[NPW-70](https://concord-consortium.atlassian.net/browse/NPW-70), "Make the network generate the
alien3 activations": the network's own forward-pass values are the activations, and the pathways
come from factor analysis on exactly those values. It carries what this design found:

- one pathway layer of at least 10 neurons, fed by 3 + n inputs, or by grouped sparse wiring;
- why a second hidden layer can't be in the fit
  ([docs/factor-analysis-dependent-neurons.md](../../factor-analysis-dependent-neurons.md));
- the bias reaching the prediction through the words, one-sidedly, which keeps the error-rate
  targets and the detectable-bias check;
- the layout options for a 13 → 10 → 4 → 2 network
  (in draft [PR #48](https://github.com/concord-consortium/neural-pathways/pull/48)).

Open: which layout, and whether giving up pathways drawn from two hidden layers is acceptable.

## Out of scope

- Generating the activations from the network (the follow-up).
- Changing the diagram, the layout or either view's steps.
- Word attribution for a neuron, in either view.
- A network for the four-pathway dataset.
