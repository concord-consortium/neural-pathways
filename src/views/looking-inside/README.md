# Looking Inside a Neural Network

The lesson's first view: follow one message through the network, a layer at a time.

## What's here

- `looking-inside.tsx`: the view. It loads the alien3 messages, keeps the shared message
  valid, and lays out the filter bar over the message card and the step row over the network.
  The network panel's head holds the shared Animate and speed control. Prev/next step through the
  messages the filter matches. When nothing matches, the card says so, and the steps and the
  network are left out. The observation notes start closed, under a heading the student opens
  and closes them with.
- `word-flights.ts`, `word-flight-overlay.tsx`: Step 1's word flights. `word-flights.ts` is the
  timing, as pure functions of the time into Step 1: each input neuron gets a pass, back to back,
  sending it a chip for each of the message's words, and each chip's landing fills the input a
  share. Passes shorten from 1.4 s to a 170 ms floor, so the length of Step 1 depends on
  the number of inputs and not on the number of words. `WordFlightOverlay` draws the chips over the
  whole layout, from the card's words to the input neurons. It measures both when Step 1 starts and
  again when the layout resizes, so the chips follow the layout, and draws nothing when Animate is
  off.
- `readout-box.tsx`, `readout-text.tsx`: the box under the network, which holds the prompt for the
  marker the timeline rests at, or the readout of the pinned neuron. The text is in
  `readout-text.tsx`. The box measures an off-layout twin holding every text it can show for the
  message, and keeps the height of the tallest as a `min-height`, so that pinning a neuron never
  resizes the diagram under the pointer. It doesn't clip: text that outgrows the height grows the
  box. It measures again whenever its width or font size changes, which browser zoom and text-only
  zoom both do. The box is a polite live region.
- `looking-inside-steps.ts`: Looking Inside a Neural Network on the shared step system in
  `src/core/steps/`: the Step 1–4 buttons; the timeline, where Step *k* plays phase *k* of
  `src/core/network-diagram/forward-pass-phases.ts`; and the progress, the marker each message rests
  at in `LookingInsideState`. Reset clears the message shown. Step 1's timeline is the word flights';
  Steps 2 to 4 are the shared phases.
- `looking-inside-state.ts`: the view's saved state, `LookingInsideState`: the marker each
  message rests at, and Animate and the speed, so they survive moving between messages
  and switching views. It also keeps whether the observation notes are open, which isn't saved
  (see `notesOpen`). Only this view uses it, so it lives here rather than in `src/core/state/`.

The pinned neuron, the hovered one and the one holding the keyboard's Tab stop are the view's
component state, not `LookingInsideState`: they aren't saved, and they don't survive a view switch
(see `docs/view-state.md`). A neuron is *reached* once its step has ended, which is when the marker
is at least its column + 1. Only reached neurons answer hover, click and the keyboard, and they stay
live while a later step plays. A step press, Reset, a message change, Escape on a neuron, a click
on the diagram's empty space and the readout's Clear button clear the pin; Animate and the speed
don't. The view hears a step press through `StepButtonGroup`'s `onPress`.

Hovering a reached neuron rings it at half strength in ink, pinning it rings it in full ink, and
keyboard focus rings it in blue; where a neuron has more than one, the pin wins. Hover, keyboard
focus and the pin each highlight the neuron's edges. Keyboard focus is the browser's
`:focus-visible`: a click focuses a neuron too, and takes the Tab stop, but rings and highlights
nothing of its own, so a click that unpins a neuron, or a click on the readout's Clear button, which
sends focus back to the neuron, leaves it unmarked. A key pressed on that neuron makes its focus
keyboard focus.

The network, the diagram, the message card and the data loading live in `src/core/`, where Extract
the Neural Pathways and Investigate the Neural Pathways can use them. The network is the one the
generator fits to the alien3 data; the view reads it from the index (`alien3Network`).

## Size

The minimum layout size (see `docs/accessibility.md`) is 981 × 562 px as an Interactive, inside the
designed size of 1024 × 562 with no height to spare.

The minimum layout width, 981 px, is the narrowest at which the network panel's head holds its
title, the activation legend and the Animate controls on one line, measured with the web fonts
loaded (`$one-line-head-width` in `looking-inside.scss`). The two columns still stack below 910 px:
the card's 447 px, a 10 px gap, and the step row, 421 px (`$two-columns-width`). The step row holds
Step 1 to Step 4, Reset and About on one line, and is wider than the network panel's narrowest,
382 px. Between 910 and 981 px the two columns hold and the head wraps, the legend and the controls
dropping below the title together; the view works there, but no reviewed design covers it.

The minimum layout height, 562 px, adds up from the top:
- the view's 9 px top padding, which takes the title's place in an Interactive;
- the filter bar and the step row, 44 px;
- a 9 px gap;
- the card and network panels at their smallest, 500 px. That is the diagram's smallest layout,
  331 px (`MIN_HEIGHT` in `layout.ts`), 80 px for the network panel's head, padding and border, the
  readout box, 81 px with its margin, and 8 px of padding under it. The panel row's minimum is the
  network panel's min-content height, so where the head wraps, between 910 and 981 px or in the
  fallback font, the panels' smallest grows with it and the page scrolls sooner.

`MIN_HEIGHT` is the least height that draws the network's tallest column, 10 input neurons, at
radius 12, the most the layout draws. The readout box holds three lines of its longest text at
981 px wide. Extract the Neural Pathways lays the network out taller, in its 440 px canvas, so
`MIN_HEIGHT` doesn't change it.

The view's 16 px bottom padding is the first thing to go as the window gets shorter, so it isn't
counted. The standalone app has no top padding, and shows the view's title above the filter bar
instead: 82 px for a 32 px heading's line and its 0.67em margins, then a 9 px gap.

Narrower than its minimum layout width, it still works, but no reviewed design covers it:
- Between 910 and 981 px the head wraps. Below 910 px the columns stack, and the page scrolls down.
  As an Interactive it is about 920 px tall just below that width, with the observation notes
  closed, and grows as more of it wraps, to about 1,210 px at 320 px.
- The head's Animate controls wrap too, the speed dropping below Animate, so the head stays inside
  its panel even in the fallback font, which is wider than the web font.
- About stays at the right end of the step row, and wraps onto its own line below the steps when
  the row is too narrow for both.
- Below 414 px, the diagram scrolls sideways inside its panel. That is the diagram's narrowest
  layout, 380 px, with the network panel's border and the app's gutters. Everything else wraps or
  stacks, and the page doesn't scroll sideways even at 320 px.
