# Extract Pathways

The lesson's second view: lift the 14 hidden neurons out of the network, then collect the
activations of conversations run through it, one column of the deck each.

## What's here

- `extract-pathways.tsx`: the view. It loads the alien3 conversations and shows the step row above
  one full-width panel holding the drawing. The panel's head holds the shared Animate and speed
  control. There is no filter and no conversation panel.
- `extract-pathways-state.ts`: the view's saved state, `ExtractPathwaysState`: whether Setup is
  done, how many conversations are collected, and Animate and the speed. A Setup or collection
  still playing isn't stored.
- `extract-steps.ts`: the buttons and the marker, on the shared step system in
  `src/core/steps/`.
- `extract-scene.ts`, `setup-timeline.ts`, `collect-timeline.ts`, `extract-timeline.ts`: what the
  view draws at any moment, as pure functions of the marker and the time into a segment, at the
  prototype's "Med" speed.
- `extract-geometry.ts`, `flight.ts`, `extract-drawing.tsx`: the canvas. The network sits in the
  middle, the lifted column in the right strip, the deck in the left. Copies of the hidden neurons
  fly on curved paths, landing in order and settling.

## Still to come

The view still needs:
- Collect All Conversations and Extract Pathways;
- the activation legend;
- About.
