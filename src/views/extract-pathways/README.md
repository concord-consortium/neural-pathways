# Extract Pathways

The lesson's second view: lift the 14 hidden neurons out of the network, then collect the
activations of conversations run through it, one column of the deck each.

## What's here

- `extract-pathways.tsx`: the view. It loads the alien3 conversations and shows the step row above
  one full-width panel holding the drawing. There is no filter and no conversation panel.
- `extract-pathways-state.ts`: the view's saved state, `ExtractPathwaysState`: whether Setup is
  done, and how many conversations are collected. A step still playing isn't kept.
- `extract-steps.ts`: the buttons and the steps done, on the shared step system in
  `src/core/steps/`. Steps done count 1 for Setup and one more for each conversation collected.
  Setup always starts over; Collect a Conversation collects the next of the first ten, in dataset
  order, jumping Setup to its end if it isn't done.
- `extract-scene.ts`, `setup-timeline.ts`, `collect-timeline.ts`, `extract-timeline.ts`: what the
  view draws at any moment, as pure functions of the steps done and the time into a step, at the
  prototype's "Med" speed. The first conversation replays Trace a Case's pass steps, faster; the
  next two drain and refill the network a layer at a time; the rest refill it quickly.
- `extract-geometry.ts`, `flight.ts`, `extract-drawing.tsx`: the canvas. The network sits in the
  middle, the lifted column in the right strip, the deck in the left. Copies of the hidden neurons
  fly on curved paths, landing in order and settling.

## Still to come

The view still needs:
- Collect All Conversations and Extract Pathways;
- the Animate and speed controls;
- the activation legend;
- About.
