# Extract Pathways, Second Half: Collect All Conversations and Extract Pathways — Design

## Overview

This is the second half of Extract Pathways' steps. Collect All Conversations finishes the deck:
up to three conversations by hand, then the network goes and the deck fills to all 800, in 40 sets
of 20. Extract Pathways moves the deck half off the canvas, sends particles from the deck to 42
loading bars beside the lifted column, builds the three pathway boxes from those bars one at a
time, and draws the lines between the bars and the boxes. Setup, Collect a Conversation and Reset
keep working alongside them, and leaving the view and coming back shows the same stage.

Jira: [NPW-48](https://concord-consortium.atlassian.net/browse/NPW-48). It builds on NPW-33 (the
first half: Setup, Collect a Conversation and the shared step system), which is on `main`. Its
branch builds on NPW-38 (Animate and speed) and NPW-60 (the narrowest designed width), both on
`main`. It blocks NPW-24, which completes the view.

The source is the `EX_STAGE0_ONLY` branch of `runExtract` in `index.html` on the
`neural-net-maker` branch of the demos repo
([live](https://models-resources.concord.org/demos/branch/neural-net-maker/), Extract Pathways).
Line numbers below refer to that file at commit `74d66f3`, as in the first half's spec
(`2026-10-05-extract-pathways-setup-design.md`).

The work is two stacked PRs (see [PRs](#prs)).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Where the view ends | On the finished picture: the half deck, the lifted column with its bars, the three boxes and the lines. Picking a neuron or a pathway to see its loadings, the tip that says so, and the loading key are left out. | The story's scope ends at "the pathway boxes appear, with their particles and lines". The view does need the picking before it is complete, so it moves to NPW-24, which completes the view. |
| Animate and speed | The new steps play at the view's speed, and Animate off or reduced motion jumps a run to its end. | NPW-38 is in this branch's base, and its step player already plays every timeline in timeline time and applies both settings. The story's note that the steps play at Med until NPW-24 predates that order. |
| Drawing | An SVG deck whose sets are memoized, so a frame changes only their transforms; the particles on a canvas over the SVG, only while they fly. | 800 columns of 14 gauges is about 34,000 SVG elements, and 1,500 particles move every frame. Re-rendering either every frame would drop frames on the 1366 × 768 Chromebook the designed size comes from. The deck keeps what SVG gives (tooltips, sharp text when zoomed, DOM checks in Jest); the particles are dots with no text, so a canvas loses nothing for them. |
| State names | `deckDone` and `pathwaysDone`, not the draft's `cubeDone`. | The glossary calls it the deck, and the first half renamed `extracted` to `setupDone` for the same reason. Nothing has shipped. |
| `collected` once the deck is done | The deck's size, 800 for alien3. | The field keeps meaning "how many conversations are collected". |
| Markers | 12 is the deck done and 13 the pathways done, after the first half's 0 to 11. | The prototype's stages are one ordered sequence, so they stay one marker. |
| Button rules | As the prototype's handlers and `syncExRow` (lines 10888–10915, 10972–11017): Collect All and Extract Pathways are always available, and each jumps to where its run starts. | Each button's segment is a plain function of the marker, which the step system already supports. |
| How many conversations the deck holds | Every conversation loaded, up to 800, in sets of 20; the last set may be partial. | alien3 has exactly 800. The prototype instead forces at least 2 sets and repeats conversation 1 to fill them (`CB_NSETS`, line 14800, and `cases[n] \|\| cases[0]`, line 13905), which would show repeated data in the tests' smaller fixtures. |
| The run's last frame | Collect All ends when the last set has closed and finished fading in, not when the prototype's final timer fires up to 80 ms earlier. | A pure `sceneAt(marker)` must equal the end of the run that reaches it. The last set's 160 ms fade outlasts its 92 ms close. |
| The deck's room on the narrowest canvas | The narrowest canvas grows from 909 to 959 px, so the finished deck fits between the canvas's left edge and the lifted column with 10 px clear each side. | At 909, the 40-set deck is about 18 px wider than its room and would run under the lifted column, the one thing still saying what a row is. The first half's spec left this width for NPW-48 to set. 959 plus the panel's border and the gutters is 993, inside the 1024 designed width. |
| Tooltips in the deck | Set 1's columns keep the neuron-name tooltips the hand-collected copies have; sets 2 to 40 have none. | As in the prototype (`makeFilled` has a title, `addColumn` doesn't, lines 13683 and 13904). Eleven thousand titles would add nothing a student could use. |
| The lines' paint order | Under the bars and the boxes. | The prototype's comment asks for that ("a connector runs between two things and should not be drawn over either of them", line 14640), though its DOM order puts the lines over the bars. |
| The particles' randomness | A seeded generator. | The timeline must be pure: the same moment always draws the same picture. |

## Extract Pathways' state and steps

### `ExtractPathwaysState`

Two fields with defaults, so the version stays 1:

```ts
/** Whether Collect All Conversations is done: the deck holds every conversation. */
deckDone: tProp(types.boolean, false),
/** Whether Extract Pathways is done: the three pathways are drawn from the deck. */
pathwaysDone: tProp(types.boolean, false),
```

`setProgress` takes all four fields in one action, so the stored stages never half change. As now,
the count is set first, since it is the one a refinement can refuse.

### The markers

| Marker | Rests at | Stored as |
|---|---|---|
| 0 | the blank network | `setupDone` false |
| 1 | Setup done, nothing collected | `setupDone`, `collected` 0 |
| 2 to 11 | 1 to 10 collected by hand | `collected` 1 to 10 |
| 12 (`DECK_MARKER`) | the deck done | `deckDone`, `collected` the deck's size |
| 13 (`PATHWAYS_MARKER`) | the pathways done | `pathwaysDone` too |

**The progress adapter.** `extractProgress(state, limit, deckSize)`:

- **Reading:** `setupDone` false gives 0. Otherwise `pathwaysDone` gives 13, `deckDone` gives 12,
  and anything else gives `1 + min(collected, limit)`, as now. A stage stored without the ones
  before it reads as the latest stage it can: `pathwaysDone` without `deckDone` is still 13.
- **Writing:** marker *m* stores `setupDone = m ≥ 1`, `deckDone = m ≥ 12`, `pathwaysDone = m ≥ 13`,
  and `collected` as `deckSize` from 12, otherwise `max(0, m − 1)`.

The markers are fixed numbers, not counted from `limit`. With fewer than ten conversations, the
markers between `limit + 1` and 11 are never reached.

### The buttons: `extractButtons(limit)`

| Button | At 0 | At 1 to 11 | At 12 or 13 |
|---|---|---|---|
| Setup | 0 → 1 | 0 → 1 | 0 → 1 |
| Collect a Conversation | 1 → 2 | *m* → *m* + 1; unavailable at `limit + 1` | 1 → 2 |
| Collect All Conversations | 1 → 12 | *m* → 12 | 1 → 12 |
| Extract Pathways | 12 → 13 | 12 → 13 | 12 → 13 |

- **Jumps.** The player stores a segment's `from` before playing it, so a segment that starts
  elsewhere jumps there first, drawn from its rest scene. Collect All from 0 starts with Setup done.
  Extract Pathways from before the deck starts with the deck standing, as in the prototype:
  "Pressed before there are any, they are simply there" (line 11001).
- **Starting over.** From 12 or 13, Collect a Conversation and Collect All start the collecting
  over from marker 1, as the prototype does (`at = 0` once `exCubeDone`, lines 10979 and 10993).
- **Interrupting.** Any press during a run drops it, and the new run starts from the stored marker,
  which is the dropped run's `from`. The prototype rebuilds from the last finished stage the same
  way ("An interrupted run ALWAYS rebuilds", line 10970).
- **Current.** As now: the running button is current, and none is at rest.
- Reset is unchanged.

In PR 1, Extract Pathways stays unavailable at every marker. PR 2 gives it the rule above.

## Collect All Conversations' timeline

All times are the prototype's, in ms at its "Med" speed, which is timeline time: the step player
stretches or squeezes them for the speed. The prototype's code is `collectAll`, `handOver`,
`buildRest`, `cbSetTwo` and `cbAddSet` (lines 15220–15248, 14783–14792, 14117–14135, 14891–14958).

Let *c* be the conversations collected when the run starts (at least 0, after the jump from 0),
*D* the deck's size (`min(conversations, 800)`), and *S* = ⌈*D* / 20⌉ its sets. The run has these
parts, back to back.

### 1. Up to three by hand

While *c* < min(3, *D*), the missing collections play first: collections *c* + 1 to min(3, *D*),
each exactly as Collect a Conversation's segment plays it, so conversation 1 is still the replay.
Their durations and scenes are the existing collect timeline's. Then *c* is min(3, *D*). The
prototype says why three: "by the third you have seen a first, a different one, and a repeat, which is the whole
pattern" (line 10870).

### 2. The hand-over, 1,350 ms

Starting from the rest scene of the last collection: the network is dimmed by the spotlight, its
"Conversation *n*" label shows, and the lifted column is at half strength.

- 0–450: a rest.
- 450–870: the network, its wires and its label fade to nothing. The lifted column comes back to
  full strength over the same 420 ms (`hideDiagram`, line 14065).
- 650–1,350: the deck slides to center min(*c* + 1, *D*) columns in its room, with `MOVE_EASE`
  (`centreCube`, line 13804). The prototype centers one column more than it has, ready for the
  first beat below.

**The deck's room** is the canvas between its left edge and the lifted column's left edge, so its
middle is `deckMid = (lifted.x − lifted.r) / 2`. *n* columns are centered when the deck's
offset is `deckMid − (deck.x − (n − 1) · r / 2)`, where `deck.x` is the first column's x and *r* the
deck's radius.

### 3. The rest of set 1

One beat for each column *i*, counted from 0, from *c* up to min(20, *D*) − 1. Here *c* is the
count after part 1, so at least min(3, *D*):

- **The beat:** `colGap(i, c) = round(240 + 660 · (1 − e))`, where `t = clamp((i − a) / (19 − a), 0, 1)`,
  `a = min(c, 18)`, and `e = t²(3 − 2t)`. The first beat is 900 ms and the last 240, eased across
  the columns this run adds, so the run has the same shape wherever it starts (`colGap`,
  line 13772).
- **The deck re-centers** for *i* + 1 columns over the beat, with `MOVE_EASE`.
- **The column arrives:** it starts 16 px left of its place, fully transparent, and moves to 4 px
  past its place over 420 ms with `EASE_X`, then settles back over 190 ms with `SETTLE_EASE`. It
  fades in over 252 ms (`addColumn` and `settleXY`, lines 13904–13959 and 13845–13879).
- **Its label:** "Conversation *i* + 1", 14 px, ending 20 px left of the column's top circle, with
  its baseline 4 px below that circle's center. It fades in over 150 ms as the previous label fades out over 150 ms
  (`nameColumn`, line 14034). Labels move with the deck.

### 4. The count, 1,180 ms

- 0–520: a rest after the last beat.
- 520–840: the last label fades out as "*n* Conversations" fades in, *n* = min(20, *D*). It is
  15 px, centered on `deckMid`, `r + 12` above the deck's top row. It doesn't move as sets arrive
  (`showCount`, line 14086).
- Then 340 ms. If *S* = 1, the run ends here.

### 5. Set 2

- Set 2 is drawn behind set 1, at its place for a deck of two sets less 50 px.
- Its columns appear one every 120 ms, each fading in over 140 ms, in place.
- 280 ms after the last appears: the face shading goes to level 1, every set moves to its place
  for a deck of two over 620 ms with CSS `ease`, and the count fades out over 300 ms, changes to
  "*n* Conversations" at 320, *n* = min(40, *D*), and fades back in (`cbSetTwo` and `cbHeadPair`,
  lines 14891–14923).
- 900 ms after the move starts, set 3 begins. If *S* = 2, the run ends when the move ends.

### 6. Sets 3 to *S*

For set *k*, numbered from 0 as in the prototype, so set 3 is *k* = 2:

- It arrives whole and behind the others, fully transparent, `enter(k)` short of its place for a
  deck of *k* + 1 sets. `enter(k)` is 50 px for *k* = 2, falling linearly to 8 px at *k* = 9, and
  8 px after.
- The face shading goes to level *k*.
- `gap(k) = round(80 + 360 · (1 − t)^1.9)`, with `t = (k − 2) / max(1, S − 3)`: 440 ms for set 3,
  down to 80 for the last.
- `hold(k)` is 340 ms for *k* = 2, 170 for *k* = 3, and 0 after.
- With no hold, it fades in over 160 ms as every set closes up to its place for a deck of *k* + 1,
  over `move(k) = max(90, min(300, round(gap(k) · 1.15)))` with CSS `ease`. With a hold, it fades
  in over 220 ms, stands for the hold, then closes the same way.
- The count changes to "*n* Conversations", *n* = min(20 (*k* + 1), *D*), when the close ends.
- The next set begins `gap(k) + hold(k)` after this one.

The run ends when the last set has closed and finished fading in (`cbSetEnter`, `cbSetGap`,
`cbSetMove`, `cbSetHold`, `cbAddSet`, lines 14823–14958).

**Where the sets sit.** For a deck of *s* sets, set *k*'s offset is

```
setX(k, s) = deckMid − span(s) / 2 + (s − 1 − k) · 2r − (deck.x − 20r)
span(s) = 21r + (s − 1) · 2r
```

so each set is one neuron's width further left than the one in front of it, and the deck is
centered in its room at every size (`cbSetLeft` and `cbSetX`, lines 14811–14812). Set 1 alone, with
20 columns, is where the first set's centering leaves it.

The prototype's sets are always full. Here the last set may be partial, and a last set of 18 columns
or fewer ends inside the set in front of it, so it adds no width. The deck is centered on what is
drawn: its width is one more than the largest 2*k* + (columns in set *k*), in radii.

### 7. The end: marker 12

The full deck, "*D* Conversations", the lifted column at full strength, and no network. From three
collected, the run is about 24 seconds at normal speed for 800 conversations.

### The deck's depth shading

The deck reads as a box: set 1's columns are its right face, every set's last column is part of its
front face, and the top row of every column is its top surface (lines 13609–13681, 13979–14032).

- **Level** `L = min(40, s − 1)` for a deck of *s* sets; 0 draws no shading.
- **The right face:** set 1's columns, except its last, take `brightness(1 − 0.005 L)` on rows 2 to
  14, and a black overlay at `0.005 L` opacity on the lower-right half of their top circle, cut on
  the deck's 45° diagonal.
- **The front face:** each set's last column takes `brightness(1 − 0.0025 L)` on rows 2 to 14, and
  the overlay at `0.0025 L` on the bottom half of its top circle.
- **The corner:** set 1's last column is both. It is shaded as the front face, and its right half
  takes an extra overlay at `1 − (1 − 0.005 L) / (1 − 0.0025 L)`, so that half lands on the right
  face's value. On its top circle, the front cut is the bottom-left quarter, and the right face's
  piece is the sector from the diagonal around to the bottom, at `0.005 L`.
- Overlays go under each circle's ring, so the rings stay at full strength.

### The rest scene at marker 12

The run's end state, built directly: every set at its place for a deck of *S*, shading at level
*S* − 1, the count, no column label, the lifted column at full strength, no network.

## Extract Pathways' timeline

The run plays 12 → 13 and takes about 14.2 seconds at normal speed. The prototype's code is
`particleStage`, `flyParticles`, `ptFrame`, `ptWire`, `pathwayStep` and `buildLines`
(lines 14300–14516, 14544–14662).

### 1. Making room, 0–1,700

- **The deck** slides left over 1,400 ms with `MOVE_EASE`, until its right edge is at
  `showR = span(S) · 0.5`: half the deck is off the canvas's left edge.
- **The count** moves with it, to the middle of what still shows, x = `showR / 2`.
- **The lifted column** slides left from 400 ms, over 1,100 ms with `MOVE_EASE`, until its left
  edge is at `showR + 100`. Its "Hidden Layer Neurons" label goes with it. The bars, the boxes and
  the lines are laid out against its final place.
- Then 200 ms.

### 2. The particles, 1,700–6,575

**The bars.** Three per neuron of the lifted column, one per pathway, on a track starting 8 px
right of the column's edge, at `trackLeft = lifted.x + lifted.r + 8` in the column's slid place:
zero at `trackLeft + 44`, and the largest loading, 0.585, 44 px either way.
Bar *p* of neuron *k* is 6 px tall, centered on `y(k) + (p − 1) · 7`. Its length is
`max(1.5, |loading| / 0.585 · 44)`, growing right from zero when positive and left when negative,
in `POSITIVE_COLOR` or `NEGATIVE_COLOR`. A 1 px rule in `$rule` marks each neuron's zero, from
the top bar's upper edge to the bottom bar's lower edge (`loadBars` and `buildBars`,
lines 14331–14375). The loadings are the prototype's `PATH_LOAD` (line 13024), until the real
network replaces them.

**The sources.** Every drawn gauge on the deck's visible faces, at the deck's slid place: every row
of set 1's columns, every row of each later set's last column, and the top row of every column
(`faceGauges`, line 14193). A gauge is drawn only when it fills at least 0.35 px of its circle.

**The particles.** 1,500, shared among the bars in proportion to their lengths, at least 4 each.
For particle *i* of a bar that needs *n*:

- its source is gauge `(j · 7919) mod sources`, where *j* counts particles across all bars;
- it is a 1.7 px dot in its source gauge's color;
- it lands at `zero ± length · (i + 1) / n` on the bar's line, outward from zero;
- it leaves at `(i / n) · 2,600 + rand · 160` ms and flies for `1,500 · (0.8 + rand · 0.45)` ms;
- it follows a quadratic curve whose control point is the midpoint, moved right by
  `30 + rand · 70` and up by `40 + rand · 90`, with ease-in-out-quad timing;
- its opacity rises over the first 12% of its flight and falls over the last 20%, and it isn't
  drawn before it leaves or after it lands.

`rand` draws from a generator seeded once for the view, in a fixed order, so the same moment always
draws the same picture.

**The bars grow** by their particles: a bar's length is its full length times the share of its
particles that have landed. All of them finish together.

**The end.** At 4,875 ms into the particles, every bar is at full length and the canvas is gone.
Every particle has landed by then, so the prototype's 300 ms fade of the particle layer has nothing
left to fade and is left out.

### 3. The pathways, 6,575–13,395

The boxes are 34 px squares with 6 px corners, white with a 2 px `$ink-2` outline, their left edge
186 px right of the lifted column's center. For *p* = 0, 1, 2, box *p* is centered at
`round(y(0) + (p + 1) · 13 · pitch / 4)`, where `pitch = y(1) − y(0)`, so the three sit a quarter, a
half and three quarters of the way down the column. "Pathway *p* + 1", 13 px, starts 10 px right of
the box, with its baseline 4 px below the box's center. Each starts fully transparent
(`addPathwayBoxes` and `buildPathways`, lines 17171–17203 and 14520–14535). The squares inside the
boxes stay empty.

After a 460 ms rest, each pathway in turn takes 2,120 ms (`pathwayStep`, lines 14544–14627):

- At 200, copies of its 14 bars lift off, neuron *k*'s after `round(k · 380 / 14)` ms. Each flies
  to the box's center over 760 ms with `EASE_X`, shrinking to 0.18 about its own center, and fades
  over its last 22%. The bars they leave turn `$rule` gray over 320 ms.
- As each copy lands, the box, its square and its label step to `(k + 1) / 14` opacity over 140 ms,
  and the box kicks: scale 1 → 1.10 → 0.98 → 1 over 300 ms with `cubic-bezier(.34,1.1,.5,1)`,
  about its own center, restarting on every arrival.
- The next pathway starts at 2,120.

### 4. The lines, 13,395–14,235

After 320 ms, every bar returns to its color over 320 ms, and the 42 lines fade in over 520 ms.
Each runs from its bar's zero to its box's left edge, at the box's center, 0.5 px in `#909090`,
under the bars and the boxes.

### 5. The end: marker 13

The half deck, the count, the lifted column with its bars at full length and in color, the three
boxes at full strength, and the lines.

### The rest scene at marker 13

The run's end state, built directly.

## The scene

`ExtractScene` gains these parts. Every number in it is a plain value, so a part's props can be
compared shallowly.

```ts
interface ExtractScene {
  // …as now: network, shown, label, lifted, and collections (renamed from deck: the columns in
  // flight or landed by hand)
  /** The network's opacity as a whole, 0 once the hand-over hides it. */
  networkOpacity: number;
  /** How far the lifted column, its label, bars, boxes and lines are moved right (negative: left). */
  liftedDx: number;
  /** The deck once Collect All has started: undefined before. */
  deck: DeckScene | undefined;
  /** Undefined until Extract Pathways starts. */
  pathways: PathwaysScene | undefined;
  /** Timeline time into the particles' flight, while they fly. */
  particles: number | undefined;
}

interface DeckScene {
  /** How far Extract Pathways has slid the whole deck left; 0 until then. */
  slide: number;
  /**
   * Every set, set 1 first: its offset (the first set's centering, then `setX`), its opacity,
   * and how many of its columns have settled.
   */
  sets: { x: number; opacity: number; columns: number }[];
  /** The column of set 1 arriving in a beat, and the ms since it started. */
  arriving: { column: number; t: number } | undefined;
  shade: number;
  label: { n: number; opacity: number } | undefined;
  count: { n: number; opacity: number; x: number } | undefined;
}

interface PathwaysScene {
  /** For each of the 42 bars, neuron by neuron: its length as a share of its full length, and whether it is gray. */
  bars: { grown: number; muted: number }[];
  /** The copies of one pathway's bars in flight: how far each is, 0–1. */
  flying: { pathway: number; progress: number[] } | undefined;
  /** Each box's opacity, and how far its latest kick is, 0–1. */
  boxes: { opacity: number; kick: number }[];
  lines: number;
}
```

Once the hand-over starts, the columns collected by hand are set 1's first columns in `deck`, and
`collections` is empty: a landed hand column and a column of set 1 are drawn the same way.

The names and shapes may change in implementation, but the scene stays a plain description: no
element counts that grow with the frame, and no per-column entries for the 800.

## The drawing

### Parts that re-render only when their part of the scene changes

- **The network:** `NetworkDrawing`, whose wires, discs and outlines are memoized, given its scene
  and `networkOpacity`. Not rendered at all once
  its opacity is 0.
- **The lifted column:** memoized on its flight, opacity, label opacity and `liftedDx`.
- **`DeckSet`:** one set of up to 20 columns, memoized on its set number, how many columns it has,
  and the shade level. It draws each column at the deck's first column, placed by a transform, so every
  column shares one clip path per row, as the copies already do. Each frame, only its wrapper's
  transform and opacity change. Sets are drawn back to front, set 1 last, and each set's columns in
  order, so later columns stand in front.
- **The arriving column and the column label:** drawn on their own, since they change every frame
  of a beat. A column joins its set when it has settled.
- **The pathways layer:** the zero rules, 42 bars, the flying copies, the boxes and labels, and the
  lines. At most 42 bars and 14 copies change per frame.

### The particle canvas

- A `<canvas>` over the SVG, the SVG's size, at the device's pixel ratio. It exists only while
  `scene.particles` is defined.
- `particlesAt(t)` is pure: it gives each particle's position, color and opacity, and each bar's
  landed count. The canvas effect only paints its output.
- It has `aria-hidden="true"`; the drawing's description covers it.

### Geometry

- **`minCanvasWidth`** becomes the larger of the first half's minimum and the narrowest width
  whose room, `lifted.x − lifted.r`, holds the 40-set deck, `span(40)`, plus 10 px each side. It is
  worked out from the geometry, not hardcoded: 959 px for the toy network.
- **The end of Extract Pathways fits** at that width: the box labels end well inside the canvas.
- **New exports** in `extract-geometry.ts` or a new `deck-layout.ts`: `deckMid`, `span(s)`,
  `setX(k, s)`, the first set's centering offset, and the face and particle source positions.

### The description for screen readers

`describeScene` gains:

- "The network's 14 hidden neurons lifted out, and all *D* conversations collected." at marker 12;
- "The 14 hidden neurons, with their loadings on three pathways drawn from all *D* conversations."
  at marker 13.

While Collect All runs, the description counts the conversations collected by hand, and changes to
"all *D* conversations collected" when the deck is done. While Extract Pathways runs, it keeps
describing the deck.
Fuller text alternatives, and anything announced as stages complete, belong to the accessibility
story for Extract Pathways.

## Testing

### Jest

- **State:** the v1 fixture still loads and saves back unchanged, with the new fields false. A new
  fixture with the deck and the pathways done round-trips.
- **The progress adapter:** each marker from 0 to 13 to the four fields and back; a hand count
  above the limit; `pathwaysDone` stored without `deckDone`.
- **The buttons:** each button's segment at markers 0, 1, 5, 11, 12 and 13, as in the table above.
  In PR 1, Extract Pathways is unavailable at each.
- **The deck's layout:** `setX` centers what the deck draws in its room, for decks of 1 to 800 with partial last sets; the first set's
  centering for *n* columns; `enter`, `gap`, `hold` and `move` at their ends.
- **Collect All's timeline:**
  - the hand-over starting once the collections by hand are done, from 1 collected;
  - its last frame equal to the scene at rest from 0, 3 and 10 collected, and with decks of 3, 20,
    30, 50 and 799;
  - below three, it starts with exactly the missing collections, and their scenes equal Collect a
    Conversation's;
  - the first set's beats shorten across the run, from 900 to 240;
  - a set's x and the count's text at chosen times;
  - with 20 conversations it ends after the count, and with 30 after set 2;
  - its last frame equals `sceneAt(12)`.
- **Extract Pathways' timeline:**
  - the slide's end positions: the deck's right edge at `showR`, the column's left edge at
    `showR + 100`;
  - a bar's length grows with its landed particles and reaches full length at the end;
  - the pathways come one at a time, each box's opacity stepping by fourteenths;
  - its last frame equals `sceneAt(13)`.
- **The particles:** the same seed gives the same positions; every particle starts on a source
  gauge and ends on its bar; opacity is 0 before it leaves and after it lands; each bar gets at
  least 4 and the total is about 1,500.
- **Geometry:** the 40-set deck fits its room with 10 px each side at `minCanvasWidth`, and not a
  pixel narrower; the box labels fit inside the canvas at the end of Extract Pathways.
- **The drawing (RTL):**
  - a `DeckSet` doesn't re-render when only its position changes, checked by spying on `columnValues`;
  - the particle canvas is present only while the particles fly;
  - set 1's columns have tooltips and later sets' don't;
  - the new descriptions.
- **The view (RTL), with fake timers:** Collect All from the start ends at the deck and stores it;
  Extract Pathways from the start ends at the pathways; leaving the view and coming back shows the
  same stage.

### Playwright (dev server, with reduced motion except where a test checks the animation)

`playwright/extract-pathways.test.ts`:

- Collect All from the start ends with the deck and "800 Conversations", and from 5 collected ends
  with the deck.
- Extract Pathways from the start jumps to the deck and ends with three boxes and 42 lines.
- Both stages survive switching to Trace a Case and back.
- After the deck, Collect a Conversation starts the collecting over at "Conversation 1".
- The width tests move to the new narrowest canvas.
- The forced-colors test checks an unavailable button other than Collect All, which is now always
  available.

### Manual, once, before each PR

- Compare against the prototype at Med: Collect All from 0, 3 and 10 collected; Extract Pathways
  (PR 2).
- Frame rate during the sets and the particles, on a Chromebook or under Chrome's 4× CPU slowdown.
- How long coming back to the view at marker 12 or 13 takes to draw.

## Docs

- **`docs/view-state.md`:** Extract Pathways' row gets `deckDone` and `pathwaysDone`.
- **`docs/glossary.md`:** the stage entry names the deck and the pathways. New entries: set (20
  columns of the deck that move as one), face (the deck's right, front and top surfaces), particle,
  loading bar, pathway box, and line (a loading's connector from its bar to its box).
- **`docs/undo.md`:** item 7 says Collect All and Extract Pathways store their stages through the
  step player too.
- **`src/views/extract-pathways/README.md`:** "What's here" gets the new files; "Size" gets the new
  minimum layout width; "Still to come" drops these two steps and adds picking a neuron or a
  pathway.

## PRs

Two stacked PRs, each about the size of the first half's second PR (43 files, about 2,300 lines).

1. **Collect All Conversations** (about 30 files): the state fields and markers; all four buttons'
   rules, with Extract Pathways still unavailable; the deck's layout, `DeckSet` and its shading;
   the memoized drawing parts; the new narrowest canvas; Collect All's timeline; their tests; and
   the README, state doc, glossary and undo doc for what it adds. If splitting the drawing makes its file
   too long, the network and lifted-column parts get files of their own, 2 to 4 more. If the PR
   runs well past the first half's size, the shading moves to a PR of its own between the two.
2. **Extract Pathways:** the slide, the bars, the particle canvas, the boxes and the lines; its
   timeline; Extract Pathways' rule; the pathways' description; their tests; and the docs that finish
   the story.

## Out of scope

- Picking a neuron or a pathway to see its loadings, its tip, and the loading key; About and the
  activation legend; and fitting the 562 px designed height (NPW-24).
- The real alien3 network and its loadings (NPW-34).
- Fuller screen-reader descriptions of the stages (the accessibility story for Extract Pathways).
