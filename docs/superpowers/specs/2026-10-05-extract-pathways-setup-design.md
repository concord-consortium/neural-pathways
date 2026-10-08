# Extract Pathways, First Half: Setup and Collect a Conversation — Design

## Overview

This is the first half of Extract Pathways: the full-width network, the step row, Setup and
Collect a Conversation. Setup lifts copies of the 14 hidden neurons out of the network into a
column of their own. Each press of Collect a Conversation runs the next conversation through the
network and flies its 14 hidden activations into a deck. Leaving the view and coming back shows
the same stage.

Along the way, Trace a Case's step player and step row move to `src/core/steps/`, so that Extract
Pathways, and later Prediction Chain, share one step system.

Jira: [NPW-33](https://concord-consortium.atlassian.net/browse/NPW-33). It builds on NPW-32
(Trace a Case's network diagram and steps), which is on `main`. It blocks NPW-48 (Collect All
Conversations and Extract Pathways), which blocks NPW-24 (Animate and speed, About and the
activation legend, completing the view).

The source is the `EX_STAGE0_ONLY` branch of `runExtract` in `index.html` on the
`neural-net-maker` branch of the demos repo
([live](https://models-resources.concord.org/demos/branch/neural-net-maker/), Extract Pathways).
Line numbers below refer to that file at commit `74d66f3`.

The work is two stacked PRs (see [PRs](#prs)).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Animate, speed and About | Not in this story. The steps always animate, at the prototype's Med timings. | The Animate and speed controls (NPW-38, NPW-44) aren't built yet, and NPW-48 comes before them. NPW-24 adds both, and the activation legend, to the view. |
| The step system | Move Trace a Case's `StepPlayer` and step row to `src/core/steps/`, generic over what is drawn and where progress is kept. Each view declares its buttons as data. | NPW-32 put the network diagram and its timing in core once a second view needed them, and this is the second view. NPW-48 and Prediction Chain then add only their own timelines and button rules. |
| Button rules | Each button says which segment it plays at the marker the timeline rests at (none when it is disabled), and can say whether it is current there. The step row works out disabled and current from those. | The rules for each view sit in one list that can be tested as plain functions. The prototype makes the same point about `syncExRow` (line 10885): "One place that decides what can be pressed". |
| Progress | One marker: a point on the view's timeline where the scene rests and progress is stored. Extract Pathways maps it to `setupDone` and `collected` in its state. | Trace a Case's steps already work this way. Setup is 0 → 1, and each collection is one more. |
| Markers and segments | The timeline's resting points are markers, and the animation between two is a segment, as in Lottie (`playSegments`) and After Effects. "Step" stays with the buttons and the row. | A button isn't a step of the timeline: Collect a Conversation plays a different segment each press, and Collect All will play across many. Trace a Case's Step *k* happens to play the segment to marker *k*. "Keyframe" would suggest in-betweens filled in for us, and `network-drawing.tsx` already uses it for the pill's pop. |
| Press rules in this story | Trace a Case's: any enabled button stops a running step, jumps to where the pressed step starts, and plays it. Collect All Conversations and Extract Pathways are shown but disabled. | Simple, and already what the prototype does for the two steps built here. NPW-48 adds the rules for the other two. |
| `extracted` | Renamed `setupDone`. | It means "Setup has been done". "Extract Pathways" is a later step, so the old name would mislead. Nothing has shipped. |
| Collect a Conversation's network animation | All three of the prototype's versions: a replay of Trace a Case's steps for the first conversation, a swap for the next two, and a quick swap after that. | The replay ties the deck back to Trace a Case. The slower swaps make each new conversation visible before they turn into shorthand. |
| The end of a collection | Everything but the hidden neurons, and the lifted column, stay dimmed once the column lands, until the next collection starts. Coming back to the view shows the same. | As in the prototype (`collectOne` and `flyColumn`, lines 15161–15215). The prototype rebuilds a returned-to screen at full strength (`restoreRun`, lines 14746–14778), but a pure `sceneAt(marker)` must match the end of the run that reached it, so here it comes back as it was left. |
| Which conversations | The first ten in dataset order. Extract Pathways doesn't read or change the shared conversation. | The prototype does the same (`cases`, line 10622, with `idx` 0). The view has no conversation panel. |
| The canvas | One SVG as wide as the panel, never narrower than 995 drawing units: the network in a 537-wide middle, the deck in the left strip, the lifted column in the right. | Before Setup the strips are just empty. This replaces the prototype's widen-and-shift (`widenForLift`, lines 13371–13411). 995 is the prototype's width at its 537 cap plus its two 229 strips, which the 20-column deck needs once NPW-48 adds it. |
| The activation legend | Left out. | It's in NPW-24's scope, and NPW-23 adds the same key to Trace a Case. |

## The shared step system: `src/core/steps/`

### `step-player.ts`

Trace a Case's `StepPlayer`, made generic. It knows nothing about networks or state models.

```ts
/** A point on a view's timeline where the scene rests and progress is stored. 0 is the start. */
type Marker = number;
/** The animation between two markers. */
interface Segment {
  from: Marker;
  to: Marker;
}
/** One play of a segment, started by a button. */
interface Run extends Segment {
  /** The key of the button that started it. */
  button: string;
}
/** A run at one moment. Replaced on every frame. */
interface Frame extends Run {
  /** Milliseconds since the run started. */
  t: number;
}
interface StepTimeline<S> {
  duration(segment: Segment): number;
  /** Pure. S is whatever the view draws. */
  sceneAt(marker: Marker, frame?: Frame): S;
}
interface StepProgress {
  readonly marker: Marker;
  setMarker(marker: Marker): void;
}

class StepPlayer<S> {
  constructor(timeline: StepTimeline<S>, progress: StepProgress);
  get marker(): Marker;
  get currentFrame(): Frame | undefined;
  get currentRun(): Run | undefined;                  // @computed, by value
  get scene(): S;                                     // @computed
  play(button: string, segment: Segment): void;
  reset(): void;
  stop(): void;
}
```

- **`play`:** stops any run, stores `from`, then runs the requestAnimationFrame clock. At
  `t >= duration(segment)` it stops and stores `to`. A run in progress is never stored.
- **Reduced motion:** `play` stores `to` straight away.
- **`reset`:** stops and stores 0.
- **`stop`:** cancels the clock and drops the run. Progress keeps `from`. The player can play
  again afterward.
- The cleanup rules don't change: only the run is held, the clock runs only while it plays, and
  the view calls `stop()` when it drops a player.

### `step-buttons.ts`

```ts
interface StepButton {
  key: string;
  label: string;
  /**
   * The segment this button plays when the timeline rests at `marker`, or undefined if it should be
   * disabled at this marker.
   */
  segmentToPlayWhenAt(marker: Marker): Segment | undefined;
  /** Whether it is marked as the current step while nothing plays. */
  showAsCurrentWhenAt?(marker: Marker): boolean;
}
```

- **Current:** the button whose run is playing. When nothing runs, the button whose
  `showAsCurrentWhenAt(marker)` is true.
- **Disabled:** `segmentToPlayWhenAt(marker)` is undefined. The running button is never disabled:
  when it gives no segment, pressing it replays its run.

### `step-row.tsx`

`<StepRow player buttons />`, an `observer`.

- It renders the buttons in order, then Reset, in a `role="group"` labeled "Steps".
- It reads `player.currentRun`, not `currentFrame`. `currentFrame` is replaced on every frame, and
  `currentRun` only when a run starts or ends, so the row re-renders only then, not on every
  frame, as NPW-32's review made Trace a Case's row do.
- A press calls `player.play(key, segment)` with that button's segment.
- The current button has `aria-current="step"`, as NPW-32's review settled for Trace a Case:
  pressing it again replays it, so it isn't a toggle and `aria-pressed` would mislead. Disabled
  buttons have `disabled`.
- Reset is `aria-disabled` at marker 0 with nothing running, and stays in the tab order.
- The step-row styles move here, to `step-row.scss`, from `trace-a-case.scss`.

### Trace a Case on the shared system

Nothing it does changes.

- **Buttons:** `Step 1` to `Step 4`. Step *k* has
  `segmentToPlayWhenAt: () => ({ from: k − 1, to: k })` and `showAsCurrentWhenAt: m => m === k`.
- **Progress:** an adapter wraps `TraceACaseState` for the conversation shown. Marker *k* is *k*
  steps done, so the state keeps the marker itself: `stepsByConversation`, `stepsDone` and
  `setStepsDone` are renamed `markerByConversation`, `marker` and `setMarker`. Nothing has
  shipped. The view makes a player for that conversation, and a new one when it changes, as it
  does on `main`.
- **Timeline:** `duration` and `sceneAt` wrap the forward pass's phases (below), with `run.to` as
  the phase: Step *k* plays phase *k*.

## The network diagram: changes in `src/core/network-diagram/`

### `forward-pass-phases.ts`

Trace a Case's `step-timeline.ts` moves here, so Extract Pathways' replay can use it: `PHASES`,
`Phase`, `PhaseFrame`, `unitDuration`, `phaseDuration`, `sceneAt`, `applyPhase` and their
constants, and a new `toPhase(n)`, which turns a marker into its phase without an `as` and throws
for a number that isn't one. The four phases are the input fill and the three fans, the last
ending with the answer. Its tests move with it. Trace a Case keeps only its button list, the
timeline wrapper and the progress adapter.

- Phases of the forward pass, the ML name for running one input through the network: a third term
  that keeps them apart from the step buttons and the timeline's markers. Trace a Case's Step *k*
  plays phase *k*, but Extract Pathways' first collection plays all four phases within one
  segment.

### `Scene.hiddenLayerSpotlight`

```ts
interface Scene {
  // …as now
  /** How strongly the hidden layers' nodes are picked out, 0–1. The rest fades to 1 − this. */
  hiddenLayerSpotlight: number;
}
```

- The name says what the effect is: the hidden layers' nodes stay lit while the rest of the
  network fades. It holds the effect's strength, so 0 draws the network normally. The prototype
  calls this dimming (`dimRest`), and so does this spec.
- What fades covers the wires, edges, input and output nodes, pills, captions and labels. The
  hidden layers' nodes stay at full strength; the prototype never dims them while
  Extract Pathways runs (`dimRest`, and `dimAll`, line 15280).
- `emptyScene` and `fullScene` set it to 0. Trace a Case never changes it.
- As in the prototype's `dimRest` (lines 13467–13478), opacity is set on each group of lines and
  labels, and on each node.
- The white discs behind the nodes, which hide the lines behind them, stay opaque. The prototype
  fades them with their nodes (`X.layer`, line 11884, includes each node's `__disc`), which lets
  the faded lines show through the faded input and output nodes. That's a bug there, not copied.

### `NetworkDrawing` and `NetworkDiagram`

- **`NetworkDrawing`** draws the network as an SVG `<g>` from the network, a layout, a pass,
  scales, output labels and a scene. Everything `network-diagram.tsx` draws moves into it, in the
  same order.
- **`NetworkDiagram`** keeps its props and behavior. It measures its box, calls `layoutNetwork`
  and wraps a `NetworkDrawing` in an `<svg>`.

Extract Pathways draws a `NetworkDrawing` inside its own wider SVG, and reads node positions from
the same layout for the flights.

## Extract Pathways: `src/views/extract-pathways/`

### `ExtractPathwaysState`

```ts
const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");

@model("npw/ExtractPathwaysState")
export class ExtractPathwaysState extends Model({
  version: tProp(types.literal(1), 1),
  setupDone: tProp(types.boolean, false),
  /** How many conversations have been collected into the deck. */
  collected: tProp(countType, 0),
}) {
  /** One action sets both fields, so the stored pair is never half updated. */
  @modelAction setProgress(setupDone: boolean, collected: number): void;
}
```

- `cubeDone` and `pathwaysDone` arrive with NPW-48, and `animate` and `speed` with NPW-24. Fields
  added with defaults don't change the version.
- It gets a v1 fixture in `__fixtures__/`, a load-and-save-back test, and `stateModel` in `VIEWS`.

**Progress adapter.**

- `marker = setupDone ? 1 + collected : 0`.
- `setMarker(m)` sets `setupDone = m >= 1` and `collected = max(0, m − 1)`. So Reset and Setup both
  clear the deck.
- Unlike Trace a Case, the state keeps the stages, not the marker. The collect limit depends on how
  many conversations are loaded, so once NPW-48 adds markers after the collections, a stored marker
  would mean different things for different datasets.
- A saved state with `collected > 0` but `setupDone` false reads as 0.

### The buttons: `EXTRACT_BUTTONS`

| Button | `segmentToPlayWhenAt(marker)` |
|---|---|
| Setup | `{ from: 0, to: 1 }` |
| Collect a Conversation | `{ from: s, to: s + 1 }` where `s = max(marker, 1)`; undefined once `n` are collected, where `n` is the smaller of 10 and the conversations loaded |
| Collect All Conversations | always undefined (NPW-48) |
| Extract Pathways | always undefined (NPW-48) |

None has `showAsCurrentWhenAt`. As in the prototype, a button is marked only while it runs
(`syncExRow`, lines 10888–10918).

The rules that follow from this:

- Collect a Conversation before Setup jumps Setup to its end, then collects Conversation 1.
- Collect a Conversation during a collection drops the conversation in flight and collects it
  again.
- Setup always starts over.
- Collect a Conversation stops at the smaller of 10 and the conversations loaded. A saved count
  reads clamped to that.
- Reset is unavailable at marker 0 with nothing running.

### Data

- The view loads `alien3Dataset` with `useDatasetIndex`, with the same loading and error states
  as Trace a Case.
- Collection *n* is `index.items[n − 1]`, labeled "Conversation *n*".
- Forward passes come from the toy network, as in Trace a Case. Scales come from all 800
  conversations, so edge widths match Trace a Case's.
- The 14 hidden activations are `pass.layers[1]` followed by `pass.layers[2]`, Hidden Layer 1's 8
  then Hidden Layer 2's 6.

### The view: `extract-pathways.tsx`

- No filter and no conversation panel.
- The step row, centered above the panel.
- One full-width panel titled "The Network → Activated Pathways" (prototype screen config, lines
  17391–17395), holding the drawing.
- One `StepPlayer` for the view, made from the state, with `stop()` on unmount.

### The drawing: `extract-drawing.tsx`

**Canvas.**

- The SVG is the panel's width and 440 tall, like Trace a Case's diagram.
- Below 995 wide it lays out at 995 and scales down through its `viewBox`.
- The network is laid out by `layoutNetwork` at 537 × 440 and centered. The strips are what is
  left on each side.

It draws an `ExtractScene`:

```ts
interface ExtractScene {
  /** Fills, edges, the answer and the hidden-layer spotlight. */
  network: Scene;
  /** Which conversation's pass the network shows, 1-based; undefined before any. */
  shown: number | undefined;
  /** "Conversation n" and its bounce, 0–1. */
  label: { n: number; bounce: number } | undefined;
  /** The lifted column; undefined before Setup lifts it. */
  lifted: { flight: number; opacity: number; labelOpacity: number } | undefined;
  /** One entry per deck column, in order. */
  deck: { conversation: number; flight: number }[];
}
```

Each `flight` is the milliseconds since that column's copies left the hidden neurons. Each copy's
timing depends on its distance, which only the drawing knows, so the drawing works out each copy's
progress from this.

When `shown` is undefined, the network is drawn with the first pass. Nothing is filled, so the
values don't show.

**Lifted column** (`liftGeom`, lines 13423–13443).

- The 14 copies are empty white discs with node rings, centered in the right strip.
- There's a 30 px label band at the top. The pitch is at most 28, and the radius scales with it.
- The column is centered down the canvas, with 10 px clear below the last circle.
- "Hidden Layer Neurons" sits above it at y = 22, in the diagram's label type.

**Deck** (`cubeGeom`, `STACK_R`, lines 13332–13357 and 13726–13730).

- Column *c* (0-based) is centered in the left strip, then moved by (−*c* · R, +*c* · R): half a
  neuron left and half a neuron down for each column before it. Later columns are drawn in front.
- R is `min(node radius, floor((440 − 34 − 2 − 10) / 47 × 10) / 10)`, sized for the 20 columns
  NPW-48 shows, so it doesn't change then.
- Each circle is a white disc with a gauge clipped to it. The gauge grows from the center, up for
  positive and down for negative, with height R · min(1, |v|), in the sign colors.

**Labels and titles.**

- "Conversation *n*" is centered over the network at y = 22. It bounces in by scaling from 0.55
  and dropping 9 px, as in `bounceIn` (lines 15315–15331).
- Each lifted and deck circle carries a `<title>` naming its neuron, as in `makeEmpty` (line
  13573).

**Accessibility.** The SVG has `role="img"`, with an `aria-label` that describes the stage. For
example: "The network, with its 14 hidden neurons lifted out and 3 conversations collected."

### Flights: `flight.ts`

Pure functions from flight progress to position and radius, matching `flyInto` (lines
13495–13566).

- **Timing.** Copy *k* flies for `800 × (0.72 + 0.45 × distance / longest distance)` ms and lands
  at `936 + 80k` ms, so the column fills top to bottom. Then it settles over 190 ms with
  `cubic-bezier(.25,.9,.35,1)`. The last copy is done at 2,166 ms.
- **Path.** X and Y move on separate easings, `cubic-bezier(.7,0,.75,.75)` and
  `cubic-bezier(.45,.05,.3,1)` (lines 12419–12420), so the path curves.
- **Overshoot.** Each copy passes its mark by 7 px along its line of travel, then settles back.
- **Size.** Each copy starts at its source neuron's radius and shrinks to the target radius on the
  way.

## The timelines

Pure functions in `setup-timeline.ts` and `collect-timeline.ts`, joined into the view's
`StepTimeline<ExtractScene>`. Timings are the prototype's Med values.

### At rest: `sceneAt(marker)`

- **Marker 0:** the blank network.
- **Marker 1:** the network plus the empty lifted column and its label.
- **Marker 1 + k:** the network showing conversation *k* in full, with its answer and all three
  weight captions; "Conversation *k*"; the lifted column; and deck columns 1 to *k*. Everything
  but the hidden neurons, and the lifted column, are dimmed to 0.5, as the last flight left them.

A run draws `sceneAt(from)` changed by its timeline at `t`. Its last frame equals `sceneAt(to)`.

### Setup (0 → 1), 3,416 ms

From lines 15428–15436.

| ms | What happens |
|---|---|
| 0–350 | `hiddenLayerSpotlight` eases to 0.5 |
| 550 | The 14 copies fly from the hidden neurons to the lifted column (see [Flights](#flights-flightts)) |
| 2,976–3,296 | `hiddenLayerSpotlight` eases back to 0, and "Hidden Layer Neurons" fades in |
| 3,416 | End |

### Collect a Conversation (*s* → *s* + 1)

This collects conversation *n* = *s*. It is the network part, a hold, then the flight. The replay
starts on the full-strength network Setup leaves. Every later collection starts with a 320 ms undim
(`undim`): `hiddenLayerSpotlight` eases back to 0 and the lifted column's opacity back to 1, and
its network part starts when that ends.

**Replay (*n* = 1)**, from `collectOne` and `runSteps` (lines 15161–15199 and 15365–15384):

- "Conversation 1" bounces in over 520 ms with `cubic-bezier(.34,1.56,.64,1)`, the opacity over
  the first 45%.
- At 540 ms, phase 1 of the forward pass plays at its normal speed. Phases 2–4 follow at 0.26 of
  their normal durations. A 110 ms gap follows each phase, the last included: `runSteps` (line
  15365) waits `STEP_GAP` after every step, then calls itself for the next.
- A 700 ms rest follows that last gap, so 810 ms pass between the end of the answer and the
  flight's dim.

**Swap (*n* = 2–3)**, about 3,080 ms, from `setConversation` (lines 15120–15147):

- **Drain.** Layer by layer, the gauges empty 12 ms apart. The layer's lines clear 20 ms after its
  last gauge, and the next layer starts 60 ms after that.
- **Blank, about 500 ms in.** The network switches to conversation *n*, "Conversation *n*" bounces
  in, and the answer is hidden. A 420 ms hold follows.
- **Refill.** Layer by layer, the gauges fill 30 ms apart. Then all of that layer's lines sweep in
  together over 360 ms, near half then far half, with `cubic-bezier(.3,.05,.4,1)`.
- **Answer.** The answer pops in at the end.
- The weight captions stay shown throughout.

**Quick swap (*n* = 4–10)**, about 460 ms, from `setConversation` (lines 15097–15118):

- Everything clears at once, and the label bounces over 0.7 × 520 ms.
- Layer by layer, the gauges fill 16 ms apart, and each layer's lines snap in.
- The answer is shown 40 ms after the last layer.

After a swap or quick swap there's a 550 ms hold (`NEXT_HOLD`). The gauges in both swaps jump,
as in the prototype, where `setNodeLevel` has no transition.

**The flight**, the same for every *n*, from `flyColumn` (lines 15200–15215):

| ms | What happens |
|---|---|
| 0–350 | `hiddenLayerSpotlight` eases to 0.5, and the lifted column's opacity to 0.5. The hidden neurons stay at full strength (`dimAll`) |
| 550 | The 14 copies fly from the hidden neurons to deck column *n*, filled with this conversation's gauges and shrinking to the deck's radius |
| 2,716 | End. The network and the lifted column stay dimmed until the next collection's undim |

## Testing

### Jest

**The step system**

- **`step-player.test.ts`** (new and generic; plain calls with fake timers and a stand-in
  timeline):
  - `play` stores `from`, runs, then stores `to`;
  - a press during a run drops it, so its `to` is never stored;
  - reduced motion stores `to` straight away;
  - `stop()` cancels the clock, and the player plays again afterward;
  - `reset()` stores 0.
- **`step-row.test.tsx`** (RTL):
  - the current button comes from the running button, or from `showAsCurrentWhenAt` when idle;
  - a button is disabled when `segmentToPlayWhenAt(marker)` is undefined, but never while it runs,
    and pressing it then replays its run;
  - Reset is `aria-disabled` at 0 and stays focusable;
  - a press calls `play` with that button's segment.

**Trace a Case**

- Its view tests keep passing with only the state field's new name changed, which shows the move
  changed no behavior. Its timeline tests move with the timeline to `forward-pass-phases.test.ts`,
  and its player tests become `trace-a-case-steps.test.ts`, which runs them on the shared player.
- Its button list: `segmentToPlayWhenAt` and `showAsCurrentWhenAt` for each step.

**The diagram**

- `network-diagram.test.tsx` keeps passing.
- `hiddenLayerSpotlight`: it fades everything but the hidden layers' nodes to 1 − its strength,
  and defaults to 0.
- `forward-pass-phases.test.ts`, the moved timeline tests.

**Extract Pathways**

- **State:** the v1 fixture loads and saves back unchanged. A bad version or a negative count is
  rejected.
- **Progress adapter:** the marker to `setupDone` and `collected` and back, including a saved state
  with `collected > 0` but `setupDone` false.
- **Buttons:** `segmentToPlayWhenAt` for each button at 0, 1, 5 and 11. Collect a Conversation is
  disabled at 11, and the last two are always disabled.
- **`flight.ts`:** the start and end positions and radius, the overshoot point, and landing order
  top to bottom.
- **Timelines:**
  - Setup's duration, and its scene as the spotlight rises, mid-flight and at the end;
  - the version chosen for each *n*: replay for 1, swap for 2–3, quick swap for 4–10;
  - a swap shows the old conversation before the blank and the new one after;
  - every run's last frame equals `sceneAt(to)`.
- **The view (RTL):**
  - the loading and error states;
  - Setup, then Collect a Conversation, with fake timers;
  - leaving the view and coming back shows the same stage.

### Playwright (dev server, with reduced motion so steps are instant)

`playwright/extract-pathways.test.ts`:

- Setup shows the lifted column.
- Three collections give three deck columns and "Conversation 3".
- Switching to Trace a Case and back keeps the stage.
- Collect a Conversation is disabled after 10.
- Reset clears everything.

The existing Trace a Case tests still pass.

### Manual, once, before each PR

- **PR 1:** Trace a Case plays, jumps and resets as before.
- **PR 2:** compare against the prototype at Med: Setup, and collections 1, 2 and 4. Check the
  flights, the timings and the end states.

## Docs

- **`docs/view-state.md`:** Extract Pathways' row, with `setupDone` in place of `extracted`. Note
  that it is now in place.
- **`src/core/README.md`:** add `steps/` to "What's here".
- **`src/views/trace-a-case/README.md`:** its step row and player now come from core.
- **`src/views/extract-pathways/README.md`:** new, with "What's here" and "Still to come".

## PRs

Two stacked PRs, so the shared system is reviewed before the view that uses it. The timeline and
its tests move to core in a commit of their own, so git shows them as renames. The core player and
row are written new, and Trace a Case's are removed once it uses them.

1. **The shared step system and the diagram split** (about 20 files): `src/core/steps/`, Trace a
   Case moved onto it, `forward-pass-phases.ts`, `Scene.hiddenLayerSpotlight` and
   `NetworkDrawing`. Nothing a user sees changes.
2. **The Extract Pathways view** (about 22 files): state, buttons, drawing, flights, timelines,
   tests and docs.

## Out of scope

- Collect All Conversations and Extract Pathways, and their state fields (NPW-48).
- Animate and speed, About, and the activation legend (NPW-24).
- The real alien3 network (NPW-34).
