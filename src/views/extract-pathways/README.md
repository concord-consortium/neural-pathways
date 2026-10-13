# Extract Pathways

The lesson's second view: lift the 14 hidden neurons out of the network, then collect the
activations of conversations run through it, one column of the deck each.

## What's here

- `extract-pathways.tsx`: the view. It loads the alien3 conversations and shows the step row above
  one full-width panel holding the drawing. There is no filter and no conversation panel.
- `extract-pathways-state.ts`: the view's saved state, `ExtractPathwaysState`: whether Setup is
  done, and how many conversations are collected. A Setup or collection still playing isn't stored.
- `extract-steps.ts`: the buttons and the marker, on the shared step system in
  `src/core/steps/`.
- `extract-scene.ts`, `setup-timeline.ts`, `collect-timeline.ts`, `extract-timeline.ts`: what the
  view draws at any moment, as pure functions of the marker and the time into a segment, at the
  prototype's "Med" speed.
- `extract-geometry.ts`, `flight.ts`, `extract-drawing.tsx`: the canvas. The network sits in the
  middle, the lifted column in the right strip, the deck in the left. Copies of the hidden neurons
  fly on curved paths, landing in order and settling.

## Size

The minimum layout size (see `docs/accessibility.md`) is 943 × 679 px as an Interactive. Its width
fits inside the designed size of 1024 × 562, but its height doesn't yet.

The minimum layout width, 943 px, is the canvas's narrowest layout, 909 px (`minCanvasWidth` in
`extract-geometry.ts`), with the panel's border and the app's 16 px gutters. The canvas holds the
network, and a strip each side wide enough for the deck's columns collected by hand. Narrower, the
canvas scrolls sideways inside its panel and the step row wraps, down to 320 px.

The minimum layout height, 679 px, comes from the canvas's 440 px (`CANVAS_HEIGHT`), below the
title, the step row and the panel's head. In an Interactive 562 px tall, the page scrolls down.

## Still to come

The view still needs:
- to fit the 562 px designed height;
- Collect All Conversations and Extract Pathways;
- the Animate and speed controls;
- the activation legend;
- About.
