# Trace a Case: Network Diagram and Steps — Design

## Overview

This is the first demo-able version of Trace a Case. It covers the right-hand side, the network
and its steps, plus a minimal conversation card to step through the 800 conversations. NPW-23
completes the view.

Jira: [NPW-32](https://concord-consortium.atlassian.net/browse/NPW-32). It builds on NPW-29
(alien3 data in core) and NPW-30 (state framework). It blocks NPW-33
(Extract Pathways), NPW-34 (the real alien3 network), NPW-36 (the full conversation card) and
NPW-38 (the Animate and speed control).

The source is the prototype's `buildNetScreen` in `index.html` on the `neural-net-maker` branch of
the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/), Trace
a Case). Line numbers below refer to that file.

The work is split into three stacked PRs: the conversation card, then the network diagram, then
the steps with the view's own state.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| How the steps animate | A pure function of time. `sceneAt(…, step, t)` computes what is drawn at any moment. The view runs a `requestAnimationFrame` clock and re-renders. | Jumps, Reset and reduced motion just set `t`, with no timers to cancel. Mid-step states can be tested in jsdom. NPW-38's speed control becomes a multiplier on `t`. |
| The diagram's interface | A stateless SVG component drawing a `Scene`: gauge fill per node, drawn fraction per edge group, the weight captions, and the answer. | Extract Pathways and Investigate Pathways build their own scenes. They don't inherit Trace a Case's steps. |
| Step 1 | The input gauges fill one by one, top to bottom, 55 ms apart (the prototype's `fillInputs`, line 15350). | The word flights are out of scope, and this keeps Step 1 visibly a step. |
| Colors | Only the two sign colors and the output-pill tokens. The five-step `FILL_POS`/`FILL_NEG` ramp and `level()` are deferred. | Trace a Case draws only the darkest step of each ramp (`paintSignal`, `setNodeLevel`); `actColour` is vestigial here. Comments on NPW-37, NPW-39, NPW-26 and NPW-40 record where the ramp is needed. |
| Where the vocabulary lives | With the network weights in `src/core/network/`. | It exists only in `scripts/`, which core may not import. The weights are meaningless without its order. |
| Step progress | Kept for each conversation in the view's own state, `npw/TraceACaseState`, as steps done by conversation id. A step still playing isn't kept. Animate and speed join the model with NPW-38. | Returning to a conversation, or to Trace a Case from another view, keeps the steps it reached. The model was already designed in the view-state target (draft PR #29), and this is the first view with its own state, so it sets the pattern for the others. It had been planned for the story that completes the view (NPW-23). |
| Conversation text | One paragraph of words, as in the prototype. The line breaks between turns are dropped. | NPW-36 owns how the full card looks. |
| Loading the index | A core hook backed by a module-level promise cache. | NPW-29 left "a hook or shared cache" to the first view that needs one. Switching views must not refetch. |
| Top-level page in CI | Not added. The release rehearsal stays manual. | The check would add a production build to every CI run, and this kind of breakage is rare. |

## The network: `src/core/network/`

### `toy-network.ts`

The prototype's `NET` (lines 10646–10686), typed:

```ts
interface NetworkLayer {
  weights: readonly (readonly number[])[];  // [out][in]
  biases: readonly number[];
  activation: "tanh" | "linear";
}
interface Network {
  vocabulary: readonly string[];            // input order
  layers: readonly NetworkLayer[];
}
export const toyNetwork: Network;
```

- **Vocabulary:** the 30 alien3 words, sorted alphabetically (`Object.keys(D.vocabulary).sort()`,
  line 10616): `aloven, arvek, blikka, chullo, …, welvin, yandor`.
- **Layers:**
  - an embedding: 10 units, 30 inputs;
  - hidden 1: 8 units;
  - hidden 2: 6 units;
  - output: 2 units, indexed `[wait, approach]`.

  Each hidden layer uses tanh. The output layer is linear and gives raw logits.
- **Labels:** the output index is the class index, so the labels come from
  `alien3Dataset.classificationLabels`. The network doesn't repeat them.
- **Doc comment:** this is a stand-in fitted offline to reproduce the model's alien3 predictions.
  NPW-34 replaces it with a network whose hidden units are the real alien3 activations, behind the
  same `Network` type.

### `forward.ts`

```ts
interface ForwardPass {
  input: number[];       // 0/1 word presence, in vocabulary order
  layers: number[][];    // post-activation value of each layer; the last is the logits
}
function forward(network: Network, text: string): ForwardPass;
function predictedClass(pass: ForwardPass): number;   // argmax of the logits
```

- **Input:** `text.split(/\s+/)` gives the words. Each vocabulary word scores 1 if present and 0
  otherwise, so repeats count once.
- **Each layer:** `activation(bias + Σ in·W)`.

### `network-scales.ts`

The drawing depends on two scales, each computed over a set of passes. The view passes all 800.

```ts
interface NetworkScales {
  edgeThresholds: [number, number][];  // per gap: tercile cut points
  logitScale: number;                  // max |logit|
}
function networkScales(network: Network, passes: readonly ForwardPass[]): NetworkScales;
function magnitudeBand(value: number, thresholds: [number, number]): 0 | 1 | 2;
```

**Edge thresholds.** These are the prototype's `MAG_T` (lines 10747–10775).
- **The drawn gaps:** there are three: embedding → hidden 1, hidden 1 → hidden 2, and hidden 2 →
  output. The 30 words → embedding edges are not drawn.
- **The pools:** for each gap, the pool holds every |source activation| and every |source
  activation × weight| across all the passes.
- **The cut points** are the values at positions `floor(n/3)` and `floor(2n/3)` of the sorted
  pool.
- **Bands:** `magnitudeBand` returns 0, 1 or 2, drawn as 1, 2 or 3 px.

**Logit scale.** The prototype's `LOGIT_SCALE` (lines 10726–10732). An output node draws
`logit / logitScale`.

## The shared diagram: `src/core/network-diagram/`

### `scene.ts`

```ts
interface Scene {
  nodeFill: number[][];     // [column][unit], 0–1: how much of the value the gauge shows
  edgeDraw: number[][];     // [gap][source unit], 0–1: 0–0.5 draws the near half, 0.5–1 the far
  weightLabel: boolean[];   // [gap]: the "× weight" caption is shown
  answer: number;           // 0 hidden; 0–1 the pill pop; 1 revealed
}
function emptyScene(columnSizes: readonly number[]): Scene;
function fullScene(columnSizes: readonly number[]): Scene;
```

`easing.ts`, next to it, holds `clamp01`, `cubicBezier(x1, y1, x2, y2)` and `ease` (CSS's `ease`),
which any animated scene can use.

- **Columns** are the drawn layers: embedding (captioned "Input Layer", as in the prototype),
  Hidden Layer 1, Hidden Layer 2, and Output Layer.
- **Edge groups:** edges are drawn per source unit, because every step plays a fan one source unit
  at a time. If Extract Pathways needs to draw single edges, it can extend the scene then.

### `layout.ts`

`layoutNetwork(columnSizes, width, height)` returns the column x positions and captions, each
node's y, the shared radius, and the output pill boxes. It follows the prototype's geometry
(`drawNet`, lines 11443–11550):

- **Area and spacing:**
  - the SVG is at least 380 × 300;
  - `top = 44`, `bot = H − 14`, with the slack split evenly;
  - nodes are at most 30 px apart, centered in their column.
- **Radius:** `R = clamp(floor(min(30, (bot − top)/9)/2) − 3, 5, 12)`.
- **Output column:** a wider step, `R·2 + 8 + 30`.
- **Captions:** 12 px, centered at y = 20.
- **Where it differs:** the prototype sized the side gutters from measured text widths. This
  layout uses fixed gutters for the caption and pill-label widths, because jsdom can't measure
  text.

### `network-diagram.tsx`

```tsx
<NetworkDiagram network={…} pass={…} scales={…} outputLabels={…} scene={…} />
```

This is one SVG with no state, no timers and no store access. It fills its container through
`useElementSize` (a ResizeObserver hook in core, with a default size where ResizeObserver doesn't
exist). From back to front:

1. **Scaffold wires:** gray (`#909090`, 0.5 px), running from each source node's right edge to the
   target's left edge. They stay drawn: an edge half is at least 1 px wide along the same line,
   so a drawn half covers its wire. The prototype hid them instead.
2. **Edge halves** (`paintSignal`, lines 12542–12554). The dash offset comes from `edgeDraw` of
   the edge's source unit.
   - **Near half** (source to midpoint): colored by the sign of the source activation, banded by
     its magnitude.
   - **Far half** (midpoint to target): colored by the sign of activation × weight, banded by its
     magnitude.
   - **Colors:** positive `#A84A2C`, negative `#1F4E8F`.
3. **Nodes** (`setNodeLevel`, lines 11383–11396). Each is a white disc, a gauge bar clipped to the
   circle, and an outline (`#6E7580`, 1 px).
   - **The gauge** grows from the center, up for positive values and down for negative, to a
     height of `R · min(1, |v|) · nodeFill`.
   - It is filled with the sign color and hidden below 0.35 px.
   - **The value** `v` is the activation, or `logit / logitScale` for outputs.
4. **Output pills** (lines 12091–12143, CSS 2405–2434).
   - **Order:** Approach on top (`OUT_ORDER = [1, 0]`).
   - **Labels:** uppercase from `outputLabels`, with the captions "Target Class:" (Approach) and
     "Other Class:" (Wait) above.
   - **Before the answer**, both pills are white.
   - **As `answer` goes from 0 to 1**, the winner takes its soft fill (`#FAE6D6` Approach, `#DCE7F7`
     Wait), grows by 3 px on every side, and its scale follows the pop curve: 0.94 → 1.10 → 0.98 →
     1.
   - **Strokes:** `#D9722E` for Approach, `#3A72BE` for Wait.
5. **Column captions,** plus a "× weight" caption at each gap's midpoint while `weightLabel[gap]`
   is true.

**Rendering cost.** The wires, captions, discs and outlines depend only on the network and the
size, so they are memoized. A frame re-renders only the edges, gauges, pills and weight captions.

**Accessibility.**
- The SVG has `role="img"` and an `aria-label` ("Network diagram", and once `answer` is 1, "…
  predicts Approach").
- Node hover, the pinned readout and per-node tooltips are out of scope (NPW-23).

### Colors: `src/core/colors.ts` and `src/core/colors.scss`

- **`colors.ts`** has what the code needs: the sign colors, `POSITIVE_COLOR = "#A84A2C"` and
  `NEGATIVE_COLOR = "#1F4E8F"`, and `signColor(value)`.
- **`colors.scss`** repeats the sign colors for stylesheets, and has the rest:
  - the class tokens, approach `#D9722E`/`#FAE6D6` and wait `#3A72BE`/`#DCE7F7`, with darker
    text shades;
  - the neutrals: ink, rules, surfaces, and the diagram's wire and node outline.

## The steps: `src/views/trace-a-case/`

The choreography belongs to Trace a Case, so it lives in the view. If Extract Pathways needs part
of it, that part is promoted to core then.

### `step-timeline.ts`

```ts
function stepDuration(step: 1 | 2 | 3 | 4): number;   // ms
function sceneAt(columnSizes, stepsDone: number, running?: { step: number; t: number }): Scene;
```

- **Completed steps** are drawn in full. The running step is drawn at `t` ms.
- **Timings** are the prototype's "Med" speed (`animSpeed = 1`).
- **What each step lights:** Step *s* fills column *s − 1*, and for *s* ≥ 2 it draws the fan into
  that column.

**Step 1.** Input node *i* fills from 0 to 1 over `[55·i, 55·i + 180]` ms, about 0.7 s in all.

**Steps 2–4** (`runFan`, lines 12848–12945). The fan plays one source unit at a time.
- **Unit timing:** unit *k* runs for `d_k = max(150, 900 · 0.76^k)` ms, starting when unit
  *k − 1* ends. That totals about 3.65 s for Step 2, 3.35 s for Step 3 and 3.0 s for Step 4.
- **Edges:** within unit *k*, `edgeDraw` goes 0 → 0.5 over the first half and 0.5 → 1 over the
  second. Each half is eased with `cubicBezier(.3, .05, .4, 1)`.
- **Gauges:** when unit *k* ends, the target column's gauges ease from *k/n* to *(k + 1)/n* over
  180 ms.
- **Caption:** the gap's "× weight" caption appears at `d_0 / 2` and stays.
- **Step 4 only:** 60 ms after the fan ends, `answer` runs from 0 to 1 over 460 ms
  (`revealAnswer`, `d1a-pillpop`).

### `step-player.ts`

`StepPlayer` is a MobX class for one conversation,
`new StepPlayer(columnSizes, state, conversationId)`, that reads and saves that conversation's
steps done in the view's `TraceACaseState` (see below). The view reads `stepsDone`, `shownStep`
and `scene` from it inside its `observer`. The only thing the player holds is the step that is
playing, `{ step, t }`, as an observable, and only while it plays. Its tests call it directly,
with no React.

- **`play(n)`:** saves `n − 1`, then runs step *n* on a `requestAnimationFrame` clock. When `t`
  reaches `stepDuration(n)`, it saves `n`. A step still playing is never saved. Pressing a step
  replays it; the buttons work as jump-to states, as in the prototype.
- **`reset()`:** saves 0 and stops anything playing.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, `play(n)` saves `n` immediately.
- **`stop()`** drops a step that is playing. The clock runs only while a step plays, so this is
  all the cleanup there is, and the player can play again afterward.
- **Changing conversation:** the view makes a player for the conversation it shows (`useMemo` on
  the id), and a new one when it changes. A layout effect stops the old player, so no frame of
  its step can run, and save, after the change is committed. The new player shows its
  conversation's saved steps, so coming back to a conversation shows what was saved for it, and a
  step cut short comes back as the step before it.
- **Unmounting** (switching views) stops the player the same way. The saved steps stay in the
  view's state, so they are there on coming back.

### The step row

The step row sits in a toolbar above the network panel, as in the prototype:
- "Step 1" to "Step 4" as buttons, with `aria-pressed` on the step shown;
- then Reset, which is disabled when `stepsDone` is 0.

In the prototype the filter sits in a matching toolbar above the conversation card, and About
sits at the right end of the step row; those come in NPW-35 and NPW-44. The filter's toolbar
cell is left empty until then, so the steps still line up over the network.

## Data, the card and shared state

### `src/core/use-dataset-index.ts`

```ts
function useDatasetIndex(dataset: DatasetDefinition, options?: { onLoaded?: (index: S3Index) => void }):
  | { status: "loading" }
  | { status: "error"; error: Error; failed: "load" | "onLoaded" }
  | { status: "ready"; index: S3Index };
```

- **The cache:** a module-level map from dataset id to `{ promise, index? }`, so there is one
  fetch per dataset per page load.
- **Already loaded:** once the index has resolved, a later mount starts in `ready`, so switching
  back to the view doesn't flash "Loading…".
- **Failures:** a failed fetch is removed from the map, so a later mount can retry.
- **`onLoaded`** runs from the promise's `then` on every mount, whether or not the index was
  cached. It runs only while the component is still mounted, never during a render and never from
  a `useEffect` reacting to the ready state. If it throws, the state is an error with
  `failed: "onLoaded"`, so the view can say the conversations loaded but couldn't be shown.
- **Tests:** the module exports a test-only way to clear the cache.

### Shared state

These come over from `NPW-30-view-state` (draft PR #29):

- **`SharedState`** gains:
  - `conversationId: tProp(types.maybe(types.string))`;
  - `setConversationId(id)`;
  - `ensureValidConversation(ids)`.
- **`src/core/state/conversation.ts`:** `validConversationId(currentId, ids)`, with its four tests.
- **The shared-state tests** for setting and correcting the conversation.
- **Fixtures:**
  - `shared-state.v1.json` gains a real 12-hex `conversationId`.
  - The old `{ "version": 1 }` shape stays as a second fixture, to show that older saves still
    load.

`query` and `commissioned` stay on the target branch until the filter (NPW-35) and Investigate
Unknown Pathway (NPW-27) need them.

### `TraceACaseState`

Trace a Case is the first view with its own state, following the steps in
`docs/view-state.md`. Only Trace a Case uses it, so the model,
`src/views/trace-a-case/trace-a-case-state.ts`, lives in the view's folder with its test and
fixture. It comes over from the draft in PR #29 with only the steps:

- `version: 1`, `$modelType` `npw/TraceACaseState`;
- `stepsByConversation`: a record of steps done, 0 to 4, by conversation id, defaulting to `{}`.
  A conversation set back to 0 is removed, so the saved form lists only conversations stepped;
- `stepsDone(id)`, which is 0 for a conversation not stepped yet, and `setStepsDone(id, n)`.

The draft's `animate` and `speed` come with the Animate and speed control (NPW-38). A fixture, `trace-a-case-state.v1.json`, has two conversations' steps.

### Keeping the conversation valid

`docs/undo.md` warns against correcting the conversation in a React `useEffect`, so the
correction happens where the list changes:

- **In the store:** the view passes `onLoaded` to `useDatasetIndex`, and it calls
  `shared.ensureValidConversation(allIds)`. This is data arriving, not a student action, so there
  is nothing to undo.
- **In the render:** the view shows `validConversationId(shared.conversationId, allIds)`, so an
  invalid id is never on screen, even before the correction lands.
- **Prev/next** call `setConversationId`.
- **The list:** until the filter (NPW-35) arrives, it is all 800 ids in index order.

### Conversation card: `src/core/conversation-card/`

NPW-36 asks for one card that the other views extend, so it starts in core. This is the minimal
version:

```tsx
<ConversationCard conversation={item} position={i} total={n} onPrev={…} onNext={…} />
```

- **Header:** "Conversation", the count "i / N" (1-based), and ◀ ▶ buttons labeled "Previous
  conversation" and "Next conversation".
- **At the ends:** the buttons get `aria-disabled` and do nothing. The list doesn't wrap.
- **Body:** the words as one paragraph, split on whitespace and joined with spaces, as in the
  prototype.
- **Scope:** it is presentational and doesn't import the store.

### The view: `trace-a-case.tsx`

It is an `observer`.

- **Layout:** a two-column grid, each column a toolbar over a panel:
  - on the left, 447 px wide, the (empty) filter cell over the conversation card;
  - on the right, the step toolbar over "The Network" panel, which holds the diagram at up to
    537 px wide;
  - narrower than 857 px, the columns stack: card, steps, network.
- **While loading:** it shows "Loading conversations…".
- **On error:** it shows the error message.
- **Once ready**, it computes, in one `useMemo` keyed on the index:
  - `forward(toyNetwork, text)` for all 800 conversations;
  - `networkScales`.
- **The diagram** then gets the current conversation's pass and the step player's scene.
- **The steps** come from `useViewState(TraceACaseState)` for the current conversation.
- **`VIEWS`:** Trace a Case's `stateModel` is `TraceACaseState`.

## Testing

### Jest

**The network**

- **`forward.test.ts`:**
  - A committed fixture of about 20 real conversations (text, id, `classification`), taken from
    the generated index. It includes both classes and some cases the model gets wrong. For every
    fixture conversation, `predictedClass` equals `classification`.
  - A few exact activations, checked against values printed from the prototype.
  - Repeated words count once. Words outside the vocabulary are ignored.
- **All 800 conversations:** during implementation, a one-off run checks that `predictedClass`
  matches `classification` for every one of them. The Jest suite doesn't depend on generated
  data (the NPW-29 decision).
- **`network-scales.test.ts`:**
  - the tercile cut points on a small hand-built pool;
  - `magnitudeBand` at and around the thresholds;
  - `logitScale`.
- **The real thresholds:** a one-off run confirms they match the prototype's (gap 0 ≈
  [0.2400, 0.8005], gap 1 ≈ [0.3705, 0.8193], gap 2 ≈ [0.4559, 0.8457]).

**The diagram**

- **`layout.test.ts`:** at 380 × 300, a typical size and a large size, nodes don't overlap,
  everything stays inside the SVG, and the radius stays within 5–12.
- **`network-diagram.test.tsx`:**
  - `emptyScene` draws wires and empty nodes only;
  - `fullScene` gives each edge half the expected color and width;
  - gauge heights and directions follow the values;
  - the pill states follow `answer`;
  - the `aria-label` names the prediction once `answer` is 1.

**The steps**

- **`step-timeline.test.ts`:**
  - the step durations;
  - Step 1 halfway through;
  - Step 3 during its third unit: earlier units at 1, the current one partly drawn, later ones
    at 0;
  - the gauges before and after a unit ends;
  - Step 4's answer;
  - `sceneAt(…, 4)` equals `fullScene`.
- **`StepPlayer`** (plain calls with Jest fake timers, which fake `requestAnimationFrame`; no
  React) **and the step row** (RTL):
  - Step 2 from nothing fills the inputs at once, then animates to completion;
  - Reset clears the scene;
  - reduced motion makes a step instant;
  - only the step before is saved while a step plays, and the step once it ends;
  - `stop()` cancels the clock and leaves the step before saved, and the player plays again
    afterward;
  - a player for a conversation not stepped yet starts with nothing done, and a new player for a
    conversation shows its saved steps, with a step cut short as the step before it.

**Data and state**

- **`use-dataset-index.test.tsx`:**
  - one fetch shared across two components;
  - the loading, error and ready states;
  - a later mount starts ready;
  - `onLoaded` runs on each mount, and not after unmount;
  - the latest `onLoaded` runs, and runs again for a new dataset;
  - a retry after an error, and a failure from a dataset no longer shown is ignored.
- **`conversation.test.ts` and `shared-state.test.ts`,** as brought over, plus a check that
  correcting a valid conversation records no change.
- **`trace-a-case-state.test.ts`:** the fixture loads and saves back unchanged; another version
  and a step count outside 0 to 4 are rejected; setting a conversation's steps leaves the others
  alone, and setting them to 0 removes the conversation.
- **`conversation-card.test.tsx`:** the count, prev/next callbacks, and `aria-disabled` at both
  ends, in the middle, and with a single conversation.

**The view and the app**

- **`trace-a-case.test.tsx`** (mocked loader):
  - loading, then "1 / 3" (three mocked conversations);
  - coming back with the index already loaded opens straight on the saved conversation;
  - an empty list leaves the saved conversation alone;
  - a throwing correction says the conversations couldn't be shown;
  - next moves the shared `conversationId`;
  - a saved `conversationId` opens on that conversation;
  - an unknown id falls back to the first;
  - each conversation's steps are kept in `TraceACaseState` and come back on returning to it;
  - changing conversation mid-step drops the step, leaving the step before saved.
- **`src/app/components/app.test.tsx`:** mocks the data loader, as the lab explorer tests do.
  Its assertions change if the view's heading changes.

### Playwright (dev server, as now)

- **Loading:** Trace a Case loads and shows "1 / 800". Next shows "2 / 800".
- **Answer:** Step 4 ends with one output pill revealed.
- **State across views** (moved from NPW-31): go to conversation 3, switch to another view, come
  back, and it still shows "3 / 800". Steps done on two conversations are still there too.

### Manual, once, before the PR

1. `npm run build:top-test`, then `npm run serve:top-test`.
2. Open the top-level `index-top.html`.
3. Confirm that Trace a Case loads its conversations from `specific/release/alien-data-3/`.

## Docs

- **`docs/view-state.md`:**
  - the shared-state table gains `conversationId` as built;
  - the "only its `version` so far" sentence changes to match;
  - the view-state table shows `TraceACaseState` in place, with only its steps.
- **`src/core/README.md`, "What's here":** add `network/`, `network-diagram/`,
  `conversation-card/`, `colors`, `use-dataset-index` and `use-element-size`.
- **`src/views/trace-a-case/`:** a short README naming what's here and what NPW-23 adds.

## Out of scope

Each of these is in NPW-23 or a shared story:

- the filter (NPW-35);
- the label chip, observation notes and attribute icons (NPW-36);
- node hover and the pinned readout;
- Step 1's word flights;
- Animate and speed (NPW-38);
- the activation legend;
- About (NPW-44).
