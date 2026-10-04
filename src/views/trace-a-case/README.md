# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and lays out the conversation card and the network, with the step row above the network.
- `step-timeline.ts`: what Steps 1–4 draw at any moment, as a pure function of time, at the
  prototype's "Med" speed. Step 1 fills the inputs one by one; Steps 2–4 play the fan into the next
  layer one source unit at a time; Step 4 ends with the answer.
- `step-player.ts`: `StepPlayer`, a MobX class for one conversation that plays a step on a
  `requestAnimationFrame` clock and gives the view the scene to draw. The view makes a player for
  the conversation it shows, and a new one when the conversation changes, stopping the old one.
  Pressing a step jumps to the state before it and plays it. Reset clears everything. Under
  `prefers-reduced-motion` a step jumps straight to its end. The steps done are kept for each
  conversation in the view's state, `TraceACaseState`, so they survive moving between
  conversations and switching views. A step still playing isn't kept. Its tests need no React.
- `step-row.tsx`: the Step 1–4 and Reset buttons.
- `trace-a-case-state.ts`: the view's saved state, `TraceACaseState`: the steps done for each
  conversation. Only this view uses it, so it lives here rather than in `src/core/state/`.

The network, the diagram, the conversation card and the data loading live in `src/core/`, where
Extract Pathways and Investigate Pathways can use them.

## Still to come

The view still needs:
- the filter;
- the label chip, observation notes and attribute icons;
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- the activation legend;
- About.
