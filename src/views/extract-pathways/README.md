# Extract Pathways

The lesson's second view: lift the 14 hidden neurons out of the network, then collect the
activations of conversations run through it, one column of the deck each.

## What's here

- `extract-pathways.tsx`: the view. It loads the alien3 conversations and shows the step row above
  one full-width panel holding the drawing. The panel's head holds the shared Animate and speed
  control. There is no filter and no conversation panel.
- `extract-pathways-state.ts`: the view's saved state, `ExtractPathwaysState`: whether Setup is
  done, how many conversations are collected, whether the deck and the pathways are done, and
  Animate and the speed. A stage still playing isn't stored.
- `extract-steps.ts`: the buttons and the marker, on the shared step system in
  `src/core/steps/`.
- `extract-scene.ts`, `setup-timeline.ts`, `collect-timeline.ts`, `collect-all-timeline.ts`,
  `extract-timeline.ts`: what the view draws at any moment, as pure functions of the marker and the
  time into a segment, at the prototype's "Med" speed.
- `extract-geometry.ts`, `flight.ts`, `extract-drawing.tsx`: the canvas. The network sits in the
  middle, the lifted column in the right strip, the deck in the left (see `ExtractDrawing`). Copies
  of the hidden neurons fly on curved paths, landing in order and settling.
- `deck-layout.ts`: the deck that Collect All Conversations builds: its size, its sets of 20, where
  each set sits in deck radii, and the timings that depend on a column or a set.
- `transitions.ts`: a value carried by CSS-style transitions, each starting from wherever the last
  left it.
- `deck-drawing.tsx`: the deck's sets, memoized (see `DeckSet`), and the depth shading of its faces.

## Size

The minimum layout size (see `docs/accessibility.md`) is 993 × 680 px as an Interactive. Its width
fits inside the designed size of 1024 × 562, but its height doesn't yet.

The minimum layout width, 993 px, is the canvas's narrowest layout, 959 px (`minCanvasWidth` in
`extract-geometry.ts`), with the panel's border and the app's 16 px gutters. At 959, the finished
deck of 800 fits between the canvas's left edge and the lifted column with 10 px clear each side,
and the left strip holds the deck's columns collected by hand. Narrower, the canvas scrolls
sideways inside its panel and the step row wraps, down to 320 px.

About sits at the right end of the step row, with the steps centered on the panel. Below 894 px it
goes on its own line below the steps.

The minimum layout height, 680 px, adds up from the top:
- the title and its margins, 82 px: a 32 px heading's line and its 0.67em margins make 81.9 px;
- a 9 px gap;
- the step row, 44 px;
- a 9 px gap;
- the panel, 520 px: the canvas's 440 px (`CANVAS_HEIGHT`), and 80 px for the panel's head, padding
  and border;
- the view's 16 px bottom padding.

Nothing in the view gives way as the window gets shorter, not even the padding, so the page scrolls
down below 680 px, as it does in an Interactive 562 px tall.

## Still to come

The view still needs:
- Extract Pathways;
- picking a neuron or a pathway to see its loadings;
- to fit the 562 px designed height;
- the activation legend.
