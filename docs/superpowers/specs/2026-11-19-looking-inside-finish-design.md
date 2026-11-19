# Looking Inside a Neural Network: neuron readouts, step prompt, word flights and legend — Design

## Overview

This finishes Looking Inside a Neural Network, the lesson's first view. A student steps one message
through the network, and now can also:

- hover a neuron to see what it is wired to, and click one the steps have reached to read its
  activation and a sentence on where the value comes from or goes;
- read a prompt under the diagram that says what to do after each step;
- watch the message's words fly from the card into the input layer at Step 1;
- read the neuron activation legend in the network panel's head.

It is the student's first look inside a neural network, so what matters is that each number they
can open is tied to what they just watched happen. The story is also the marker for testing the
finished view.

Jira: [NPW-23](https://concord-consortium.atlassian.net/browse/NPW-23). It builds on NPW-32 (the
first version), NPW-35 (filter), NPW-36 (message card), NPW-38 (Animate and speed) and NPW-44
(About), and is stacked on NPW-74 (v1.4 design, PR #53), which is stacked on NPW-73 (PR #52). The
branch is `NPW-23-looking-inside`, from `NPW-74-v1.4-design`.

The source is prototype v1.4: `index.html` at commit `7acc4db` on the `neural-net-maker` branch of
the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/),
Looking Inside a Neural Network). The screen is `buildNetScreen`. Line numbers below are in that
file.

## Goals

- Hover and keyboard focus on a reached neuron highlight its connections. Clicking it, or Enter or
  Space on it, pins a readout with its activation and its layer's sentence.
- The prompt under the diagram says what to do after each step, and is empty while a step runs.
- At Step 1, copies of the message's words fly from the card into each input neuron, filling it as
  they land.
- The panel head shows the neuron activation legend. The title, legend and Animate controls fit or
  wrap when Barlow Condensed hasn't loaded.
- Everything already built keeps working: the filter, the card, Steps 1–4 and Reset, Animate and
  speed, About, and each message keeping the step it reached.
- No prompt or readout text is cut off, at 200% zoom included.

## Non-goals

- The output's "before Step 4" readout, which v1.4 can't reach (see
  [The readout box](#the-readout-box)).
- v1.0's "what drives this neuron" readout (`NEURON_FACTS`, the fan-in/fan-out branch of `pinText`,
  12290–12309). v1.4 can't reach it.
- Hover text on neurons as its own feature, step buttons between the layers, hover on connections
  (from Jie's doc; Michael ruled out connection hover and left the others for a later design cycle).
  Neurons do get a `<title>` tooltip, as the prototype has, because it comes free with the hit
  targets (see [Hover and pin](#hover-and-pin)).
- The diagram's text alternative and step announcements (NPW-49). This story makes the neurons
  reachable and labeled, which NPW-49 builds on.
- Serving Lato and Barlow Condensed with the app. That would close the fallback-font gap for every
  view; it's a separate change.

## Anti-goals

- A word flight that runs off its own clock. If Slow, Fast, Animate off, Reset or a message change
  left chips flying or neurons out of step with them, the flights would be worse than none.
- Slowing Extract the Neural Pathways. It replays the shared phases for every message it collects.
- Clipping the readout, as v1.4 does, so that zoomed text is cut off.
- 26 extra Tab stops after Step 4.

## Constraints

- `docs/accessibility.md`: text is drawn at full size, never scaled to fit; the view's minimum
  layout size must fit inside 1024 × 562; down to 320 px wide everything still works.
- Michael owns the visual design. Where accessibility conflicts with it, keep the design and log the
  conflict in NPW-49 for him to decide.
- The step system: a view's timeline is pure (`sceneAt(marker, frame)`), written in Medium timings.
  `StepPlayer` applies the speed, Animate, reduced motion and stopping.
- `src/core/` holds what more than one view uses. The legend is used by Extract the Neural Pathways
  later (NPW-24), so it goes in `src/core/`.

## Approaches

### Keyboard access to the neurons (chosen: B)

| | Approach | Trade-off |
|---|---|---|
| A | The prototype's: each reached neuron is its own Tab stop (12504, 13024). | Simplest. Up to 26 stops after Step 4 between the step row and whatever follows. |
| **B** | **One Tab stop for the neurons; arrow keys move between them; Enter or Space pins.** | **One stop. More to build and test: a roving tabindex and arrow-key handling.** |
| C | Mouse only now; keyboard access in NPW-49. | Least work, but the readout is the point of the story and keyboard users would have none of it. |

Scott chose B.

### Running the Step 1 word flights (chosen: A)

| | Approach | Trade-off |
|---|---|---|
| **A** | **On the step clock. Step 1 is a Looking Inside version of phase 1 whose scene says how far each chip has flown and how full each input neuron is. A layer over the view draws the chips at positions measured from the word spans and the diagram's neurons.** | **The player's speed, Animate, Reset, message change and reduced motion apply for free; the flight math is pure and unit-tested. Costs measuring screen positions across the card and the diagram, in both layouts and with the diagram scrolled.** |
| B | Web Animations per chip, fired when Step 1 starts, as the prototype does (13145–13273). | Closest to the prototype's code, but runs beside the player: a speed change misses chips already flying, every stop path must cancel them separately, the fill can drift from the chips, and jsdom can't test it. |

Scott chose A. A third option, flying chips in from the diagram's left edge rather than the card,
was dropped: it fails "fly from the card".

## Design

### Step 1: word flights

**Timing.** The prototype's Step 1 at Medium (13145–13273, constants 12897–12923):

- Input neuron *i* (top to bottom) gets a pass of `dur(i) = max(170, 1400 × 0.7^i)` ms. Passes run
  back to back (`PASS_OVERLAP = 1`). Pass *i* starts at the sum of the earlier passes.
- In a pass, every word of the message sends one copy to that neuron. Copies are ordered by their
  distance from the word to the neuron, nearest first. Copy *k* of *n* lands at
  `dur × (0.7 + 0.3 × k / (n − 1))` (all at `dur` when *n* = 1), so the nearest lands at 70% of the
  pass and the farthest at its end.
- A copy moves horizontally with `cubic-bezier(.7,0,.75,.75)` and vertically with
  `cubic-bezier(.45,.05,.3,1)`, so it drops first and sweeps in sideways. Opacity and scale stay at
  1 until 86% of its flight, then go linearly to 0 and 0.12 at landing.
- Each landing deepens the neuron: after *k* + 1 of *n* copies its fill is `(k + 1) / n`, and the
  last lands it exactly on its activation. The fill eases to each new level over the shared
  `FILL_DURATION` (180 ms), as the fan phases do. The prototype uses a 0.18 s CSS transition.
- Step 1 ends when the last landing's fill has eased in: `FILL_DURATION` after the last pass ends.
  The prototype ends its step 60 ms after the last pass and lets the CSS transition finish after
  it; ending at 60 ms here would snap the last neuron to full, since the marker rests at 1 once
  the run ends. With 10 input neurons that is about 5.0 s at Medium, against 0.68 s for today's
  fill. (Builder's call, from the design review.)

The duration depends only on the number of input neurons, not on the message's word count, so
`duration()` stays a function of `columnSizes`. The fill depends on the word count, so the timeline
is made per message from the column sizes and the word count. The player is already made per
message.

**Where it lives.** `forward-pass-phases.ts` keeps phase 1 as it is, for Extract the Neural
Pathways. Looking Inside gets its own Step 1 timing in a new pure module in its folder (say
`word-flights.ts`): pass starts and lengths, each copy's landing time, its position along its path
for a time *t*, and the input fill for a time *t*. `traceTimeline` uses it for marker 0 → 1 and the
shared phases for 2–4.

**The scene.** Looking Inside's timeline gets its own scene type: the network `Scene`, plus, while
Step 1 plays, the time into Step 1. The flight positions aren't in the scene, since they depend on
screen geometry. The overlay computes them from that time and the measured geometry, through the
pure functions above. At rest, and in every other step, there is nothing in flight.

**The overlay.** A layer positioned over the view's layout (`position: absolute`, the layout
`position: relative`, `pointer-events: none`, above the panels), drawn only while Step 1 plays. It
holds one chip per copy in flight: an HTML element in the message font (Spline Sans Mono, 12.5 px),
white with the rule border, 4 px radius, `2px 5px` padding and the prototype's shadow (2088–2095),
`aria-hidden`. The words in the card stay as they are.

**Geometry.** At the start of Step 1, and again if the layout resizes while it plays, the overlay
measures, relative to the layout:

- each word span's center (`.message-words__word`);
- each input neuron's center: the diagram host's offset, less its scroll, plus the node's layout
  position.

The prototype aims at each chip's own center, since a chip is wider than its word. The overlay does
the same: it starts each chip centered on its word's center and ends it centered on the neuron.

In the stacked layout the card is above the network, so chips fly down. In the wide layout they fly
right. If the diagram is scrolled so a neuron is out of view, its chips fly to where it is, which
may be outside the diagram's box; they fade by the time they land, so this is acceptable. Words
scrolled out of the card can't happen, since the card's words don't scroll.

**Stopping.** Through the player, as every run: Animate off or reduced motion jumps to marker 1
with nothing flown; turning Animate off during the run finishes it; Reset, a step press and a
message change stop it, and the overlay draws nothing when nothing plays.

### Hover and pin

**Reached.** A neuron in column *c* is reached when the marker is at least *c* + 1: the input layer
after Step 1, Hidden Layer 1 after Step 2, Hidden Layer 2 after Step 3, the outputs after Step 4.
This is the marker the timeline rests at, so a neuron becomes reached when its step ends, not when
it starts (13124–13135, 12994–13032). Unreached neurons don't respond to hover or click, show no
pointer cursor, and aren't focusable.

**Hit targets.** As in the prototype (12544–12576), each neuron gets an invisible rectangle above
the drawing, 10 px wider than the circle and one row's pitch tall, so neighbors touch and moving down
a column doesn't flicker. The output pills are a second target for their neuron (12616–12621). The
cursor is a pointer only on targets of reached neurons (2364–2373). Each target carries a `<title>`:
the neuron's name before it is reached, and "Activation = −0.42" after (13004–13007).

**Highlight** (12647–12729, CSS 2327–2354). While a reached neuron is hovered or focused, or
pinned:

- the edges touching it stay at full strength and are drawn above the others;
- the other edges in the two gaps it sits between (the one into its layer and the one out of it)
  dim to an opacity of 0.1;
- edges in other gaps, and the gray wires, are unchanged.

Only drawn edges take part: a gap the steps haven't reached shows wires, which aren't dimmed. While
a neuron is pinned, hovering another doesn't change the highlight; it stays on the pinned one
(12665).

**Rings** (2384–2412, 12581–12589). Each neuron has a ring 3.5 px outside its circle, never a CSS
outline (SVG outlines are square). Hover shows it at half strength in ink; pinned at full strength
in ink; keyboard focus in the focus blue. The drawing passes these as props; `NetworkDrawing` stays
stateless.

**During a run.** The neurons reached by the marker the run started from stay live while it plays,
as in the prototype, whose `live()` checks only whether a neuron is reached (12529). So a student
can hover and pin an input neuron while Step 3 plays, and the highlight dims edges while the fan
is still drawing. The neurons the run is reaching become live when it ends. (Builder's call, from
the design review.)

**Pinning.** Clicking a reached neuron (or its pill), or Enter or Space on a focused one, pins it;
doing so again on the pinned neuron unpins it. The pin clears on: the readout's clear button,
Escape on a focused neuron, a click on the diagram's empty space, any step press, Reset, and a
message change (12354–12357, 12405–12441, 13028–13030). It doesn't clear on Animate or speed changes.

### The keyboard

The reached neurons form one Tab stop, using a roving tabindex: the neuron last focused has
`tabindex="0"` and the rest `-1`. With none focused yet, the first reached input neuron takes the
stop. Before Step 1 there is no neuron stop.

| Key | On a focused neuron |
|---|---|
| Up / Down | The neuron above or below in its column. Stops at the ends. |
| Left / Right | The nearest neuron by height in the next reached column to that side. Stops at the ends of the reached columns. |
| Home / End | The first or last neuron in its column. |
| Enter / Space | Pin or unpin it. |
| Escape | Clear the pin. |

Focusing a neuron applies the same highlight as hovering it. Moving focus scrolls the diagram to
show it, as `focus()` does. If the stop's neuron stops being reached (Reset, a message change), the
stop moves to the first reached input neuron, or goes away.

The diagram's scroller (`useKeyboardScrollable`) stays a Tab stop of its own while it overflows,
since it scrolls the drawing's text as well. Arrow keys on the scroller scroll it; on a neuron they
move between neurons.

**ARIA.** Each reached neuron is `role="button"` with `aria-pressed` and an accessible name: its
layer and number and its activation, as "Hidden Layer 1 Neuron 3, activation −0.42"; an output is
"Output Layer: Approach, activation 1.83" (12511–12512, 13013–13014). Unreached neurons are
`aria-hidden`, not buttons.

The SVG is `role="img"` today, which hides everything inside it from assistive technology, so the
buttons would be unreachable. It becomes a `role="group"` with the same label ("Network diagram",
or "Network diagram. The network predicts Approach."). The scroller stays the `group` named by the
panel heading. The drawing's own text, which `role="img"` hid until now (the column captions,
"× weight", the output labels, and the unreached neurons' tooltips), gets `aria-hidden`, so a
screen reader meets only the group's label and the neuron buttons, whose names carry the layer.
NPW-49, which plans to rework these roles, gets a note that the neurons are now buttons inside, and
that grouping each column's neurons under its caption ("Hidden Layer 1, group") was left to it.
(Builder's call, from the design review.)

### The readout box

One box below the diagram, inside the network panel, holds either the prompt or a pinned neuron's
readout (2415–2445).

**Look.** `colors.$surface` background, `colors.$rule-soft` border, 6 px radius, `7px 10px` padding,
8 px above it, Lato 13 px at line height 1.45, `colors.$ink-2`. The prompt is italic in
`colors.$ink-3`. Bold names are `colors.$ink`. The readout has a clear button at its right, ×, named
"Clear", 36 × 36 like the prototype's, centered vertically.

**Height.** v1.4 fixes the box at the height of its tallest text, capped at two lines, and clips
the rest (12311–12345). It is fixed so that clicking a neuron doesn't resize the diagram and move
the neurons under the pointer (2423–2426). This box keeps the fixed height but drops the cap: it
measures the tallest text it can show for this message, at the box's width and font size, prompts
and readouts both, and holds that height, whatever it is. It measures again when its width or the
font size changes:

- Browser zoom changes the box's width in CSS pixels; a `ResizeObserver` on the box catches it.
- Text-only zoom (Firefox's "Zoom text only") changes the font size but may leave the width alone.
  The measuring copy, an off-layout twin of the box at its width and type, is observed too: bigger
  text makes it taller, which triggers the measurement.
- The held height is a `min-height`, never a `height`, and nothing is clipped, so text that outgrows
  it before the next measurement grows the box rather than being cut off.

At the designed size that is two lines, as in v1.4; at 200% zoom, in a narrow
panel or in the fallback font it is more, and the diagram gives up the room. Logged in NPW-49 as a
conflict with the design: the box can be taller than two lines, and the diagram then shrinks.
(Builder's call, from the design review: a `min-height` that grows with each text would re-lay out
the diagram on clicks.)

**Prompt text** (11866, 11940–11975), by the marker the timeline rests at:

| Marker | Prompt |
|---|---|
| 0 | Click **Step 1** to see how the message is represented by activation values of the neurons in the Input Layer. |
| 1 | The message has been represented as activation values of the neurons in the Input Layer. Click any neuron in the Input Layer to see its activation value. |
| 2 | Click any neuron in the Input Layer or Hidden Layer 1 to see how data flows. |
| 3 | Click any neuron in the Input Layer, Hidden Layer 1, or Hidden Layer 2 to see how data flows. |
| 4 | Click any neuron in any layer to see how data flows. |

With nothing pinned, the box is empty while any run plays (`player.currentRun` set), Step 1
included (12410–12426). A neuron pinned during a run shows its readout.

**Readout text** (12229–12289). The head is "**Hidden Layer 1 Neuron 3**: Activation = −0.42",
with the activation to two decimals and a real minus sign. After it, a sentence by layer:

| Neuron | Marker | Readout |
|---|---|---|
| Input Layer | 1 | the head only |
| Input Layer | 2 or more | head. This value is multiplied by different weights before being passed to the Hidden Layer 1 neurons. |
| Hidden Layer 1 | 2 or more | head. Data from the Input Layer neurons is weighted and combined to set this neuron's activation value. |
| Hidden Layer 2 | 3 or more | head. Data from the Hidden Layer 1 neurons is weighted and combined to set this neuron's activation value. |
| Approach / Wait | 4 | Data from the neurons in the Hidden Layer 2 are weighted and combined to determine the probability of “Approach”. (or “Wait”) |

If a pin is open when a step ends, the readout is rewritten for the new marker (13132–13134): an
Input Layer readout pinned during Step 2 gains its sentence when Step 2 ends.

The ticket also lists an output readout for before Step 4 ("**Approach** — one of the two numbers
the network ends on. The larger one is the answer."). The outputs aren't reached before Step 4, in
v1.4 (13018–13023) as here, so it can never show. Scott chose to leave it out; the PR notes it for
Jie and Michael.

**Live region.** The box is `aria-live="polite"`, so a screen reader hears the prompt after each
step and the readout on a pin. NPW-49's announcements will build on it.

### The activation legend

A new `src/core/activation-legend/` component: the caption "Neuron Activation" over a row of two
miniature neurons, each followed by its sign: a 22 px circle filled blue from the middle down, "−";
a 22 px circle filled orange from the middle up, "+" (2098–2141, 11530–11547). Barlow Condensed
14 px, 600, letter-spacing 0.05em, uppercase, `colors.$ink-2`. Swatch colors come from
`src/core/colors`, the ones the gauges use, with the node's outline. The swatches are drawn with
`forced-color-adjust: none` so they keep their colors in forced colors, like the diagram. The swatches
are `aria-hidden`; the caption and signs are text.

**The head's order** (11740–11751): title, legend, a short vertical rule, Animate, speed. The legend
takes the `margin-left: auto` that pushes everything after it right, so the title stays left.

### The head without the web font

Today, in a 480 px window with Barlow Condensed blocked, the Animate controls are 207 px wide rather
than 184 px and run 16 px past the head. Adding the legend makes this worse. The fix is the head's
CSS, whatever the root cause turns out to be: the head wraps, its items don't overflow it, and in a
narrow head the legend and controls drop below the title. Check, with Google Fonts blocked:

- at the minimum layout width (910 px view) and at 480 px, nothing in the head runs past its edge;
- the existing "wrap below the title" test keeps passing with the web font.

Update `docs/accessibility.md`'s known gap (the head growing between 910 and about 935 px in the
fallback font) with the new measurements.

### Minimum layout size

The legend and the readout box don't fit the view's current minimum layout size, 910 × 524 px.
Scott chose to raise the width and give the height back from the diagram:

- **Width.** With the legend, the network panel's head holds its title, legend and controls on one
  line only from about 1,010 px of view width (an estimate: title about 150 px, legend about 130 px,
  rule and gaps about 30 px, controls 184 px, padding 28 px). Below that the head wraps, which the
  design doesn't show, so the minimum layout width becomes the width where the head fits on one
  line, inside the designed 1024. Measure it with the web fonts loaded, and set it from what the
  head holds, as the step row's width is set today (`$step-row-width` in `looking-inside.scss`). The
  two columns still stack below 910 px as now; between 910 px and the new minimum the head wraps
  and the view still works.
- **Height.** The box adds about 62 px to the network panel at two lines: 8 px margin, 2 px of
  border, 14 px of padding and two 18.85 px lines. That would take the minimum layout height from
  524 px to about 586 px, 24 px over the designed 562. Lower the diagram's smallest layout
  (`MIN_HEIGHT` in `layout.ts`, 300 px) by what it takes for the view to fit 562 tall at the new
  minimum layout width, about 276 px. At that height the neurons' radius goes from 10 to 9 px.
  `MIN_HEIGHT` is shared with Extract the Neural Pathways: check its layout still holds.

Update the README's size sections, the comments that set these numbers, and the Playwright checks
of the minimum layout size.

## State

The pin, the hovered neuron, the keyboard stop and the flight geometry are the view's component
state, never in the state tree. They aren't saved, aren't undo steps, and don't survive a view
switch or a message change, as in the prototype, which forgets them on every redraw.

| Value | Owner | Written by | Read by | Changes | Survives | Saved |
|---|---|---|---|---|---|---|
| marker per message | `LookingInsideState` (exists) | `StepPlayer` | timeline, prompt, reached | step end, Reset | everything | yes |
| run playing | `StepPlayer` (exists) | `play`, `stop` | prompt (empty), overlay | step press, end | nothing | no |
| pinned neuron | view component | click, keys, clears | readout, rings, highlight | per click | nothing: cleared by steps, Reset, message change | no |
| hovered neuron | view component | pointer, focus | rings, highlight | per pointer move | nothing | no |
| keyboard stop | view component | focus, reached change | roving tabindex | per arrow | nothing | no |
| flight geometry | overlay | measuring at Step 1 start and on resize | overlay | per Step 1 | nothing | no |

Add the pinned neuron and the keyboard stop to `docs/view-state.md`'s "Deliberately not kept".

## The view's states

| Marker | Run | Reached columns | Box | Neuron Tab stop | Chips |
|---|---|---|---|---|---|
| 0 | none | none | prompt 0 | none | none |
| 0 → 1 | Step 1 | none | empty | none | flying |
| 1 | none | Input | prompt 1, or readout | yes | none |
| *k* → *k*+1, *k* ≥ 1 | Step *k*+1 | columns before *k* | empty, or the readout of a neuron pinned during the run | yes, on reached | none |
| 2, 3 | none | Input to column *k* − 1 | prompt *k*, or readout | yes | none |
| 4 | none | all | prompt 4, or readout | yes | none |

A step press from any marker first jumps to the marker before its own and clears the pin, as today.

## Glossary

Add to `docs/glossary.md`, under the network diagram:

- **reached:** a neuron whose step has ended: column *c* once the marker is at least *c* + 1. Only
  reached neurons answer hover, click and the keyboard.
- **pin:** the neuron clicked, whose readout shows. Not "selected".
- **readout:** the text about the pinned neuron.
- **prompt:** the text in the same box when nothing is pinned.
- **chip:** a copy of a word in flight at Step 1. Not "fly" or "flier".

## Testing

Jest:

- The Step 1 timing: pass starts and lengths, landing times, copy positions at given times, the
  input fill per landing, and that the duration doesn't depend on the word count.
- `traceTimeline`: Step 1 uses the new timing and Steps 2–4 the shared phases; Extract's collect
  timeline is unchanged.
- The prompt and readout text for every row of the tables above, with the minus sign.
- Reached, hover and pin: unreached neurons ignore pointer and keys; clears on each of the listed
  events; the pin stays through an Animate change.
- The keyboard: each key in the table, the stop moving on Reset, no stop before Step 1.
- The legend's markup and names.

Playwright:

- Hover on a reached neuron dims the other edges in its gaps and not the rest.
- Click pins a readout; Step, Reset and message change clear it.
- Keyboard: Tab to the neurons, arrows, Enter pins, Escape clears.
- During Step 1 chips appear over the layout and are gone after it, in both layouts; with Animate
  off none appear.
- The box is two lines tall at rest and grows, uncut, at 200% zoom and with text-only zoom.
- The head with Google Fonts blocked, at 480 px and at the minimum layout width.
- At the new minimum layout size, the head is one line, nothing scrolls, and the page doesn't
  scroll down; at 910 px wide the head wraps without overflowing.

## Docs to update

- `src/views/looking-inside/README.md`: what's here, the new minimum layout size, and drop "Still
  to come".
- `src/core/README.md`: the legend.
- `docs/view-state.md`, `docs/glossary.md`, `docs/accessibility.md` as above.
- NPW-49: the box can grow where v1.4 clips; the SVG is now a `group` with buttons in it.

## Left to the builder

- The exact component split between the view, the drawing and the overlay, as long as
  `NetworkDrawing` stays stateless and the flight math is pure.
- The root cause of the fallback-font overflow, and the CSS that fixes it.
- Matching the prototype's colors for lit edges where ours already carry sign colors on both halves.
