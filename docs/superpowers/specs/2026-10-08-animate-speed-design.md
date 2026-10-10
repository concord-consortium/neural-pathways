# Animate and Speed — Design

## Overview

An Animate checkbox and a Slow/Med/Fast speed slider, one shared control in `src/core/`, added to
Trace a Case and Extract Pathways. With Animate on, a step plays at the chosen speed. With it off,
the slider is disabled and each step jumps to its end. Both values are kept in the view's state, so
they survive switching views.

The speed is applied once, by the shared step player, not by each view. Every view's timeline stays
written in the prototype's Med timings, and the player runs it on a clock that goes slower or
faster than real time. No view defines a timeline per speed.

Jira: [NPW-38](https://concord-consortium.atlassian.net/browse/NPW-38). It builds on NPW-33
(Extract Pathways' first half and the shared step system), PRs #36 and #37. Prediction Chain
(NPW-26) gets the control in its own story.

The source is `index.html` on the `neural-net-maker` branch of the demos repo
([live](https://models-resources.concord.org/demos/branch/neural-net-maker/)). Line numbers below
refer to that file at commit `74d66f3`.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Where the speed is applied | In `StepPlayer`, as a clock that advances by real time divided by the speed's multiplier. Timelines don't change. | Every animation in the views already runs through the player. Applying the speed there gives Prediction Chain, and any later view, the speed for free. |
| The multipliers | Slow 1.7, Med 1, Fast 0.6: how long a run takes, relative to Med. | The prototype's own values (`SPEEDS`, line 8898, and `SPEEDS_D1A`, line 11228). Med is the speed its timings were tuned at, and every timing in our timelines is already the Med value. See [Matching the prototype](#matching-the-prototype). |
| A speed change during a run | Takes effect from the next frame, with no jump. | Falls out of the clock: the time already played stays played. The prototype's Prediction Chain does the same (`rescale`, line 8955). |
| Animate off when a step is pressed | The run jumps straight to its end, as under reduced motion today. | The ticket. |
| Animate turned off during a run | The run finishes: its end marker is stored on the next frame. | The student gets the step they pressed. The prototype is split: Extract Pathways finishes the run (line 11259), and Trace a Case drops back to where it started (`applyStepState(stepDone)`, line 11262). |
| Extract Pathways | Gets the control in this story. | NPW-33 went to review without it, and with the player applying the speed it is only the model props and the control. |
| Reduced motion | Unchanged: every run jumps to its end whatever the checkbox says, and the checkbox keeps the stored value. | As in the prototype (`motionOff`, lines 8862 and 11233). |
| The state | `animationProps` and `Animated`, from the NPW-30 branch, spread into `TraceACaseState` and `ExtractPathwaysState`. Both stay at version 1. | The view-state rules: adding a field with a default doesn't change the version. |

## Matching the prototype

The prototype has one speed knob per screen, and multiplies durations by it. How much of each
screen it reaches:

- **Extract Pathways:** everything. Every delay and transition goes through `tms(ms)`, which
  returns `ms × exSpeed` (line 11219). That is exactly one multiplier.
- **Trace a Case:** the fans' unit durations, Step 1's word flights and the weight label's delay
  are multiplied (lines 12676, 12889, 12894). Three short timings don't change: the gauges' fill
  transition (`FILL_DURATION`, 180 ms) and the answer pill's pop (`ANSWER_DURATION`, 460 ms,
  line 2418) are fixed CSS, and the 60 ms wait before the answer (`ANSWER_DELAY`, line 12943) isn't
  multiplied. Scaling them too keeps Steps 2–4 within 10% of the prototype's length at Slow and at
  Fast. (The prototype's Step 1 is the word flights, which this view doesn't draw.) Step 4, where they are the largest share, takes about 6.0 s rather than 5.7 s at Slow,
  and 2.1 s rather than 2.3 s at Fast.
- **Prediction Chain**, for NPW-26: one beat, `SCAN_HOLD` (300 ms, line 9157), is damped to about a
  third of the speed change by `react()` (line 8909). At Slow it lasts 374 ms rather than 510 ms.

The differences are small, so one multiplier for each speed is close enough.

## The player: `src/core/steps/`

### `playback.ts` (new)

```ts
/** What the player needs from a view's animation settings. Any `Animated` model is one. */
export interface PlaybackSettings {
  readonly animate: boolean;
  readonly speed: Speed;
}

/** How long a run takes at each speed, relative to normal (the prototype's Med). */
export function durationScale(speed: Speed): number;
```

`durationScale` returns 1.7, 1 and 0.6 for `SPEED.slow`, `SPEED.normal` and `SPEED.fast`, with a
comment citing the prototype's `SPEEDS`.

### `step-player.ts`

- The constructor takes the settings third: `new StepPlayer(timeline, progress, settings)`.
- `play()` jumps to `to` when `!settings.animate`, or under reduced motion.
- Each tick:
  1. If `settings.animate` has gone false, the run finishes: `stop()`, then `setMarker(to)`.
  2. Otherwise `t` advances by the real time since the last frame, divided by
     `durationScale(settings.speed)`.
  3. The run ends when `t ≥ duration`, as now.

  The first tick still sets `t` to 0 and records the frame's time.
- There is no reaction to clean up. The check happens on the next frame, at most about 16 ms after
  the change, and the clock runs only while a run plays. So `stop()` is still all the cleanup there
  is.
- `Frame.t` and `StepTimeline.duration` are documented as **timeline time**: milliseconds at normal
  speed, which take longer at Slow and less at Fast.

## The control: `src/core/animation-controls/`

### `animation-controls.tsx`

`AnimationControls({ animated }: { animated: Animated })`, an `observer`:

- A checkbox labeled "Animate", bound to `animated.animate` and `setAnimate`.
- A range input from 0 to 2 in steps of 1. Its value is the `Speed` itself, since `SPEED` is
  already 0, 1, 2, and changing it calls `setSpeed`. It has `aria-label="Animation speed"` and an
  `aria-valuetext` of "Slow", "Med" or "Fast".
- "Slow / Med / Fast" under the stops, the current one emphasized. They are `aria-hidden`: the
  value text already says the speed.
- While Animate is off, the slider has the `disabled` attribute and the speed group is dimmed to
  0.4 opacity.

### `animation-controls.scss`

Styled from the prototype's `.nnm-animtoggle` (line 3750) and `.nnm-speed` (lines 3631–3742): a
92 px slider with a 24 px white thumb and a 2 px rule, the track drawn as its own line between
the outer stops, and each label pinned under the place its stop's thumb rests. The colors come
from `src/core/colors.scss`. The checkbox uses `colors.$wait`, the prototype's `--nnm-neg`.

Keyboard focus shows through `:focus-visible`. The prototype instead cancels `mousedown` on the
checkbox's label so a click never focuses it. That isn't needed once the ring shows only for
keyboard focus.

- **The checkbox's ring** goes round the label and its box together where `:has()` works, as in
  the prototype. Chrome 104 and earlier, which the browserslist still includes, don't support
  `:has()`, so there the ring goes round the box alone. `@supports selector(:has(*))` chooses.
- **In forced colors** the slider gets an outline on keyboard focus, since forced colors repaints
  the thumb's border the same in every state and drops its shadow.

### Placement

In both views the control sits at the right end of the network panel's head. The head becomes a
`div` with the panel-head look, holding the view's `<h2>` and the control. The `<h2>` keeps its id,
so `aria-labelledby` and Extract Pathways' `headingId` don't change.

The head, not the control, decides where things sit: the title takes the row's slack
(`margin-right: auto`), which pushes the control right. The legend that comes later then goes
between them without overriding the control. The head wraps, so in a narrow panel the control
drops below the title instead of being cut off. The prototype also puts the
activation legend and a divider to the control's left. The legend isn't in this story, so the
divider waits for it too.

## The state

- `src/core/state/animation.ts` and `animation.test.ts` come over from the `NPW-30-view-state`
  branch unchanged: `SPEED`, `Speed`, `Animated` and `animationProps`.
- `TraceACaseState` and `ExtractPathwaysState` spread `...animationProps`, declare
  `implements Animated`, and add `setAnimate` and `setSpeed` as model actions.
- Each view passes its state to its `StepPlayer` as the settings, and to `AnimationControls`.
- The v1 fixtures gain `animate: false` and `speed: 0`, so the round-trip tests cover the new
  fields. A saved form without them still loads, with Animate on at normal speed.

## Testing

### Jest

- `step-player.test.ts`, with a settings object at normal speed and Animate on for the existing
  tests:
  - a 1000 ms segment takes about 1700 ms at Slow and 600 ms at Fast;
  - changing the speed mid-run keeps `t` where it was and carries on at the new rate;
  - with Animate off, `play` stores `to` with no frame and no timer;
  - turning Animate off mid-run stores `to` on the next frame and stops the clock;
  - reduced motion still stores `to` straight away.
- `playback.test.ts`: the three multipliers.
- `animation-controls.test.tsx`: the checkbox and slider call the setters; the slider is disabled
  while Animate is off; the value text follows the speed; the current label is emphasized.
- `trace-a-case-state.test.ts` and `extract-pathways-state.test.ts`: the defaults, the setters, and
  loading a saved form without the new fields.
- `trace-a-case.test.tsx` and `extract-pathways.test.tsx`: the control is in the network panel's
  head; with Animate off a step button stores its end marker straight away; a run at Fast ends well
  before Med's would, so each view's speed reaches its player; and, in Extract Pathways, unchecking
  Animate during Setup finishes it.
- `step-row.test.tsx` and `trace-a-case-steps.test.ts` pass settings to the players they make.

### Playwright

In `playwright/trace-a-case.test.ts` and `playwright/extract-pathways.test.ts`:
- the arrow keys move the slider, and the unchecked box and a changed speed are still set after
  switching to another view and back;
- with Animate off, Trace a Case's Step 4 and Extract Pathways' Setup land within a second;
- in a 480 px window, the control wraps below the title, inside the head.

In `playwright/trace-a-case.test.ts` only:
- clicking where "Slow" is moves the slider there;
- the control ends at the head's right edge;
- the checkbox shows keyboard focus, and the slider shows it in forced colors.

Extract Pathways' keyboard-scrolling test tabs to the canvas from the speed slider, now the
head's last stop.

### Manual, once, before the PR

Play a step at each speed in both views, change the speed mid-run, and uncheck Animate mid-run.

## Docs

- `docs/view-state.md`: mark Animate and speed as built for Trace a Case and Extract Pathways, and
  drop "Animate and speed arrive with their controls".
- `src/core/README.md`: the `steps/` entry says the player applies the speed; a new
  `animation-controls/` entry; `state/` mentions `animation.ts`.
- `docs/glossary.md`: **timeline time**, under the step system: the milliseconds a timeline is
  written in, which are real milliseconds at normal speed. Not "virtual time".
- `src/views/trace-a-case/README.md` and `src/views/extract-pathways/README.md`: the view shows the
  shared control.

## Out of scope

- Prediction Chain's control (NPW-26), and damping its `SCAN_HOLD` beat.
- The activation legend and the divider before the control, the About button, neuron hover, and
  words flying in at Step 1.
