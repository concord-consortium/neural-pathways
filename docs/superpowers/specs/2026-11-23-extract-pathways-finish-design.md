# Extract the Neural Pathways, Finished: Picking, the Keys, and the 562 px Height — Design

NPW-24. Builds on NPW-33 (Setup, Collect a Message), NPW-48 (Collect All Messages, Extract
Pathways), NPW-38 (Animate and speed), NPW-44 (About) and NPW-75 (the Interactive leaves out the
title), and on NPW-23 (PR #54), which builds the activation legend this story uses.

## Overview

This story finishes Extract the Neural Pathways. NPW-48 ends on the finished picture: the loading
bars beside the lifted column, the three pathway boxes and the 42 lines. This story adds what the
prototype does next, and makes the view fit the Activity Player on a Chromebook:

1. **Picking.** Once the pathways are drawn, a student can pick one of the 14 lifted neurons or one
   of the three pathway boxes to see only its loadings, by mouse or keyboard. Picking it again shows
   them all. A three-line tip says what to do.
2. **The panel head's keys.** The head gets the neuron activation legend (NPW-23's
   `ActivationLegend`) and a divider to the left of Animate and speed. Once the pathways are
   extracted, a loading legend slides in beside the legend.
3. **The fallback font.** The title, the keys and the Animate controls fit, or wrap, even when
   Barlow Condensed hasn't loaded.
4. **The 562 px height.** As an Interactive, the view fits 1024 × 562 without the page scrolling.

Why: this is the last story before the view is tested as a whole (NPW-24 is also the marker for
that testing), and 562 px is the height an Interactive gets in the Activity Player on a 1366 × 768
Chromebook, the device students mostly use (`docs/accessibility.md`).

**Source.** Prototype v1.4, `index.html` at commit `7acc4db` on the demos repo's `neural-net-maker`
branch: `buildLines`, `pwLit`, `pwApply`, `pwPick`, `makeInteractive` (around line 15140),
`showLoadKey` and `collapseLoadKey` (around line 11570), and the `.d1a-scale`, `.d1a-loadscale`,
`.d1a-loadbar.mute`, `.d1a-loadring`, `.d1a-loadtip` and `.d1a-pathbox.*` styles (around lines
2150–2312).

## Goals, non-goals, anti-goals

**Goals**
- Picking a neuron or a pathway box works by mouse and by keyboard, and a screen reader can tell
  what is picked and what its loadings are.
- The view fits 1024 × 562 as an Interactive with the web fonts loaded, and the head never overruns
  the panel when they haven't loaded.
- Everything already built keeps working: Setup, Collect a Message, Collect All Messages, Extract
  Pathways, Reset, Animate and speed, About, and coming back to the same stage.

**Non-goals**
- Saving the pick. `docs/view-state.md` keeps a selection only for Investigate the Neural Pathways.
- A canvas that grows with the window (see Approaches).
- Renaming the buttons (NPW-73) or anything for Investigate the Neural Pathways (NPW-25), beyond
  putting the loading legend where NPW-25 can use it.

**Anti-goals**
- Scaling the drawing or its text to fit. Text is drawn at full size, and a drawing too wide
  scrolls sideways in its own keyboard-reachable region (`docs/accessibility.md`, WCAG 1.4.4).
- Picking that works only by mouse, as the prototype's neurons do.
- A head that fits only when the web font has loaded.

## Approaches to the height

With a 440 px canvas the view needs 598 px as an Interactive: 9 px top padding, the 44 px step row,
a 9 px gap, the panel (80 px of head, padding and border, plus the 440 px canvas), and 16 px bottom
padding. That's 36 px too tall for 562.

- **A. A fixed 404 px canvas (chosen).** Change `CANVAS_HEIGHT` from 440 to 404. Everything else
  is laid out from it, so the lifted column and the deck get slightly tighter, and the minimum
  layout width shrinks a little.
- **B. A canvas that fills the panel's height, with a 404 px minimum,** as the prototype and Looking
  Inside do. Not chosen: the network's neurons are already at their 12 px cap at 404 px, and the
  lifted column reaches its cap (12 px, 28 px apart) at 440. Only the deck keeps growing, and a
  bigger deck needs more width: at 600 px tall the minimum canvas width would pass 1,200 px. With
  the deck capped, a taller canvas only adds empty space above and below the picture.

At 404 px, the network's neurons stay 12 px, the lifted column's are 11.1 px and 25.8 px apart (from
12 px and 28 px), and the deck's are 7.6 px (from 8.3 px).

## Decisions

| # | Decision | Whose |
|---|---|---|
| 1 | Fixed 404 px canvas (approach A) | Scott |
| 2 | Start from NPW-23's branch, rebase onto `main` once #54 merges, and use its `ActivationLegend` | Scott |
| 3 | The pick isn't saved or kept across switching views; it is React state in the view | Claude's call, per `docs/view-state.md` |
| 4 | The loading legend is `LoadingLegend` in `src/core/loading-legend/`, beside `ActivationLegend`, since Investigate the Neural Pathways shows it too | Claude's call |
| 5 | The pick targets are on a transparent SVG layer over the drawing, so the drawing keeps `role="img"` and its description | Claude's call |
| 6 | Keyboard: the 14 neurons are one Tab stop and the three boxes another, each a roving tabindex with the arrow keys, as Looking Inside's neurons are (`neuron-targets.tsx`). Enter and Space toggle; Escape clears | Claude's call, following NPW-23 |
| 7 | A click on empty canvas doesn't clear the pick, as in the prototype | Claude's call |
| 8 | The loading legend's slide is driven by the scene's `lines` progress, not a CSS transition, so speed, Animate off and reduced motion apply to it as they do to the drawing | Claude's call |
| 9 | The drawing's description names the pick and lists its loadings | Claude's call, for accessibility |
| 10 | The tip uses v1.3's wording: "Click a neuron or / a neural pathway to see / how they are linked." | Jira acceptance criteria |
| 11 | Focus is drawn in `$wait` outside the pick ring and picked outline, so both show | Claude's call, from the builder check |
| 12 | Any step press clears the pick | Claude's call, from the builder check |

## When picking is available

Picking is available only **at rest after Extract Pathways**: `scene.pathways?.done` is true and no
step is playing. That is the state at marker 13, whether it was reached by playing Extract Pathways,
by jumping there with Animate off or reduced motion, or by coming back to the view.

**Any step press clears the pick**, wired to `StepButtonGroup`'s `onPress`. That includes pressing
Extract Pathways again at marker 13 with Animate off or reduced motion, where the scene doesn't
change: a press always starts from the whole picture. Whenever the scene stops being at rest after
Extract Pathways, the targets and the tip are removed too.

## The pick

```ts
/** What is picked: a lifted neuron (0–13) or a pathway (0–2), or nothing. */
type PathwaysPick = { kind: "neuron" | "pathway"; index: number } | undefined;

/** Whether loading (neuron, pathway) is lit: everything when nothing is picked. The prototype's pwLit. */
function isLit(pick: PathwaysPick, neuron: number, pathway: number): boolean;

/** Whether two picks are the same item, or both nothing. */
function samePick(a: PathwaysPick, b: PathwaysPick): boolean;

/** Picking the picked item again clears; anything else picks it. The prototype's pwPick. */
function togglePick(pick: PathwaysPick, next: NonNullable<PathwaysPick>): PathwaysPick;
```

These are pure functions in a new `pick.ts` in the view's folder, so the drawing, the targets and
the description read one rule for what is lit. The type isn't named `Pick`, which would hide
TypeScript's `Pick<T, K>`.

### What a pick changes in the drawing

| Thing | Nothing picked | Neuron *k* picked | Pathway *p* picked |
|---|---|---|---|
| Loading bars | Each in its sign's color | Neuron *k*'s three in their colors; the rest `RULE_COLOR` | Each neuron's bar for *p* in its color; the rest `RULE_COLOR` |
| Lines | All 42 | Neuron *k*'s 3 | Pathway *p*'s 14 |
| Neuron *k* | — | A ring: radius `lifted.r + 3.5`, no fill, `$ink`, 2 px | — |
| Box *p* | 2 px `$ink-2` outline (`.extract-drawing__box`) | — | Outline `$ink`, 3 px |
| Zero rules, labels, other boxes | Unchanged | Unchanged | Unchanged |

The muting is immediate, as in the prototype (no transition). The bars already take a `muted` mix
toward `RULE_COLOR`; a pick sets it to 1 for unlit bars, on top of the scene's own (0 at rest).

### Pointer

- **Neurons:** a transparent target over each lifted neuron, the column's pitch tall and the
  neuron's diameter plus 10 px wide, so moving down the column never falls between targets (as
  `NeuronTargets` does). Hovering shows the pick ring at half opacity; `cursor: pointer`.
- **Boxes:** the box's own square is the target. Hovering darkens its outline to `$ink`; pressing
  draws it at 3 px, what picking leaves behind; `cursor: pointer`.
- A click toggles. A click doesn't leave a visible focus ring (`:focus-visible`), but it does move
  that group's Tab stop to what was clicked.

### Keyboard and ARIA

The targets layer is an `<svg>` the same size as the drawing, absolutely positioned over it and the
particle canvas, after both in the DOM. It is `role="group"` named by the tip's text. It holds two
groups of buttons:

| Element | Role and name | State | Keys |
|---|---|---|---|
| Neuron target *k* | `role="button"`, `aria-label` "{name}, show its loadings on the three pathways", where {name} is `hiddenNames`' ("Hidden Layer 1 Neuron 3") | `aria-pressed` | Tab stop when it holds the group's roving stop; Up/Down move (stopping at the ends); Home/End to the first and last; Enter/Space toggle; Escape clears |
| Box *p* | `role="button"`, `aria-label` "Pathway {p+1}, show its loadings on the 14 neurons" | `aria-pressed` | As above, among the three boxes |

The roving stop starts on the first item of each group. Keyboard focus is drawn in `$wait`, the
app's focus color (the step buttons, the message card and Looking Inside's neurons use it), rather
than the prototype's `$negative`:
- **A neuron:** a 2 px ring at radius `lifted.r + 6.5`, outside the pick ring, so a neuron that is
  both picked and focused shows both. Looking Inside lets the pin hide its focus ring, but it also
  highlights the focused neuron; this view has no highlight, so focus must stay visible on its own
  right after Enter picks a neuron (WCAG 2.4.7).
- **A box:** a 2 px outline 2 px outside the box, as a rounded `rect`, since an SVG element's CSS
  outline is square; it doesn't touch the box's own outline, so picked and focused show both.

In forced colors, focus is `Highlight` and the pick ring and picked outline `CanvasText`, as in
Looking Inside. Modified keys (Alt/Ctrl/Meta) are left alone.

Tab order: the speed slider, then the drawing's scroller when it scrolls, then the neurons, then the
boxes. The targets move with the drawing when it scrolls, since they are inside the scroller.

### The drawing's description

`describeScene` gains the pick. At rest after Extract Pathways:

- Nothing picked: unchanged ("The 14 hidden neurons, with their loadings on three pathways drawn
  from all 800 messages."), unchanged.
- Neuron *k*: that, then "Hidden Layer 1 Neuron 3's loadings: Pathway 1 +0.62, Pathway 2 −0.05,
  Pathway 3 +0.11."
- Pathway *p*: that, then "Pathway 2's loadings: Hidden Layer 1 Neuron 1 +0.10, …" for all 14.

Loadings to two decimals with an ASCII minus (`spokenNumber`), since some speech engines skip
U+2212, as Looking Inside's neuron names do. The description is the drawing's `aria-label`, so it is
read on demand, not announced; `aria-pressed` announces the change of pick.

### The tip

Three lines of SVG text, on the targets layer, `pointer-events: none`, shown whenever picking is
available, and it stays while something is picked (the prototype: picking one side doesn't teach
you the other is pickable too):

```
Click a neuron or
a neural pathway to see
how they are linked.
```

Lato 13 px italic, `$ink-2`, lines 16 px apart. Left edge at `min(boxes' x, width − 186) − 5`,
first baseline at y = 30, as in the prototype. It is hidden from assistive technology as text and
names the targets group instead. The builder checks it clears the boxes and the canvas's right edge
at the minimum layout width; a Playwright test checks it in the fallback font, the wider one.

## The panel head

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ THE NEURAL NETWORK → ACTIVATED PATHWAYS     NEURON ACTIVATION   LOADING   │ [✓] Animate  ──●── │
│                                               ◐ −  ◑ +       − ▬▬|▬▬ +   │                   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

The title, then a tools group pushed right: `ActivationLegend`, `LoadingLegend`, a 1 × 24 px
`$rule` divider, `AnimationControls`. This is Looking Inside's head (`looking-inside__network-tools`
and `__network-rule`) with the loading legend added. The group wraps as a whole below the title, and
wraps inside itself when the head is narrower than the group. Whether the shared pieces move into
`panel.scss` or are repeated in this view's stylesheet is left to the builder; the rule is that
nothing is copied that a third view would copy again.

### `LoadingLegend`

In `src/core/loading-legend/`, built like `ActivationLegend`: a "Loading" caption over a row of
"−", two stacked bars, "+". Each bar is 88 × 6 px (`BAR_MAX` either side of zero at `BAR_HEIGHT`),
1 px apart: the top one's left half `$negative`, the bottom one's right half `$positive`, with a
1 px `$rule` line down the middle the pair's height. The row's minimum height is 22 px, the
activation legend's swatch, so the two captions sit on one line. The bars are hidden from assistive
technology; the caption and signs are read. Colors stay in forced colors, like the drawing's.

### The loading legend's slide

Before the pathways are extracted the key takes no room: not displayed, so the head's gap doesn't
open beside it. As Extract Pathways' lines arrive (`scene.pathways.lines` going 0 to 1), the key
widens from 0 to its measured width, and its opacity fades in from 0.35 of the way through, as
`showLoadKey` does (widen over the whole, fade over 0.7 of it starting at 0.35), so it reaches 0.93
as the lines end. At rest after Extract Pathways it is shown in full. Driving it from `lines` means
speed, Animate off and reduced motion apply as they do to the lines, and coming back to the view
shows it at once.

The key is shown when `pathwaysDone` (or the scene's `pathways.lines > 0`), and hidden otherwise,
including after Reset.

### Without the web font

In a 480 px window the Animate controls are 207 px wide in the fallback font, not 184. With Google
Fonts blocked (`page.route(/fonts\.(googleapis|gstatic)\.com/, …)`), at 480 px and at the minimum
layout width, nothing in the head may extend past its right edge, and the tools group must start
below the title when it doesn't fit beside it. The head may wrap to more lines in the fallback font,
and the page may then scroll down at 562 px: that is accepted, as in Looking Inside's README.

## The 562 px height

`CANVAS_HEIGHT` is 404, down from 440. With the web fonts loaded, at the minimum layout width, the
Interactive is then 9 + 44 + 9 + (80 + 404) + 16 = 562 px, provided the head stays one line there
with both keys shown. The builder confirms that, and that the minimum layout width (now computed by
`minCanvasWidth` at the new height) still holds the head on one line; if it doesn't, the minimum
layout width is raised to where it does, as NPW-23 did for Looking Inside.

The deck of 800 must still fit its room at the new minimum width, with the 10 px clear each side,
and the pathway labels and the tip must end inside the canvas: the existing Playwright tests for
these run at the new width.

## State map

| State | Owner | Writer | Readers | Changes | Survives | Saved |
|---|---|---|---|---|---|---|
| `setupDone`, `collected`, `deckDone`, `pathwaysDone`, Animate, speed | `ExtractPathwaysState` | the step player, `AnimationControls` | everything | per step | switching views, reload | yes (unchanged) |
| The pick | `ExtractPathwaysBody` (`useState`) | targets' click and keys; cleared by any step press | drawing, targets, description | per click | nothing: lost on switching views | no |
| Each group's roving Tab stop | the targets layer | focus and click | targets | per focus | nothing | no |
| Hovered target | the browser (CSS `:hover`, where there is hover) | pointer | the hover ring and outline | per pointer move | nothing | no |
| The loading legend's reveal | derived from `player.scene` | — | `LoadingLegend`'s wrapper | per frame while lines play | — | no |

`docs/view-state.md`'s "Deliberately not kept" gains the Extract the Neural Pathways pick.

## UI states and events

| State | Pick | Targets | Tip | Loading legend | Event → next |
|---|---|---|---|---|---|
| Before the pathways are done, or a step playing | none | absent | absent | hidden, or sliding in while lines play | lines end → At rest |
| At rest, nothing picked | none | present, no `aria-pressed` true | shown | shown | pick X → X picked; step that leaves rest → Before |
| At rest, X picked | X | X's `aria-pressed` true | shown | shown | X again or Escape → nothing picked; Y → Y picked; any step press → nothing picked, and Before if the step leaves rest |

Switching views and back lands in "At rest, nothing picked" if the pathways are done.

## Glossary additions (`docs/glossary.md`)

- **pick:** the one lifted neuron or pathway whose loadings are shown alone, or none.
  `PathwaysPick`.
- **tip:** the three-line instruction over the pathway boxes.
- **loading legend:** `LoadingLegend`, the head's key for the loading bars, beside the activation
  legend. The story and the prototype call it the loading key; code and docs say loading legend.

## Prototype comparison

| Prototype | Here | Why |
|---|---|---|
| Neurons clickable only by mouse | Neurons are buttons, one roving Tab stop | Keyboard access (acceptance criteria) |
| Boxes each a Tab stop | Boxes one roving Tab stop | Matches the neurons; fewer stops |
| Focus ring in `--nnm-neg` | Focus in `$wait`, outside the pick ring | The app's focus color; focus stays visible on a picked item |
| `showLoadKey` CSS transition, `PW_LINES` long | Driven by `scene.pathways.lines` | Speed and Animate apply |
| Canvas fills the panel's height | Fixed 404 px | Approaches, above |
| No description of the pick | The description lists the picked loadings | Screen readers |
| Same | Muted bars, ring, 3 px outline, tip text and place, line subsets | — |

## Testing

### Jest
- `pick.ts`: `isLit` for none, a neuron and a pathway; `togglePick` picks, switches and clears.
- `PathwaysLayer` with a pick: unlit bars `RULE_COLOR`, the right lines, the ring, the box outline.
- The targets layer: 14 + 3 buttons with names and `aria-pressed`; one Tab stop per group; arrow,
  Home/End, Enter/Space, Escape; modified keys ignored; absent unless at rest after Extract
  Pathways.
- `describeScene` with each kind of pick, a negative loading spoken with an ASCII minus.
- `LoadingLegend` renders its caption and signs, with the bars hidden from assistive technology.
- The view: the pick cleared by any step press and by Reset; no targets and no loading legend
  before the pathways are done; the legend sliding open and fading in partway through the lines;
  focus moving from a target to the pressed step.
- The geometry tests updated for 404 px.

### Playwright
- Pick a neuron and a box by mouse, then by keyboard; pick again and Escape clear.
- The pick isn't kept on switching views; the stage and the full-width loading legend are.
- The pick and focus in system colors in forced colors, and the loading legend's bars on their own
  white in a dark forced-colors theme.
- Pressing a box draws its outline on a touch screen, with no hover.
- `MIN_LAYOUT_HEIGHT` is 562: no scroll at 562, a scroll at 561, at the minimum layout width.
- Fonts blocked: at 480 px and at the minimum layout width, nothing in the head overruns it.
- The existing tests still pass: deck fits, labels fit, step row, About, Animate and speed.

### Manual, once, before the PR
Compare against the prototype in the Activity Player preview size (1024 × 562): the picture after
Extract Pathways, a picked neuron, a picked pathway, the tip, the head with both keys.

## Docs

- The view's README: what's here (pick, targets, tip, keys), the Size section for 404 px and the
  new minimum layout size, and "Still to come" removed.
- `docs/view-state.md`: the pick under "Deliberately not kept".
- `docs/glossary.md`: the terms above.
- `src/core/README.md`: `loading-legend/` and `legend.scss`.
- `docs/accessibility.md`: the 562 px height, and the head's sizes in the fallback font.
- Looking Inside's README: Extract's canvas height.

## Left to the builder

- How the head's shared styles are shared with Looking Inside.
- The exact component split for the targets layer, and whether it reuses pieces of
  `neuron-targets.tsx` (such as `hasVisibleFocus`) by moving them somewhere shared.
- Raising the minimum layout width if the head doesn't fit on one line at the computed minimum.

## PRs

One PR. The branch started from `NPW-23-looking-inside` and was rebased onto `main` once PR #54
merged.

## Out of scope

- Button renames (NPW-73).
- Investigate the Neural Pathways (NPW-25), except that `LoadingLegend` is in `src/core/` for it.
- Reporting the view's height to the Activity Player.
