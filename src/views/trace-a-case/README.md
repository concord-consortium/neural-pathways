# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and lays out the conversation card and the network, with the step row above the network.
- `trace-a-case-steps.ts`: Trace a Case's steps on the shared step system in `src/core/steps/`:
  the Step 1–4 buttons, the timeline (the pass steps in `src/core/network-diagram/pass-steps.ts`,
  at the prototype's "Med" speed), and the steps done for each conversation, kept in
  `TraceACaseState`. Pressing a step jumps to the state before it and plays it; Reset clears
  everything; under `prefers-reduced-motion` a step jumps straight to its end. The view makes a
  player for the conversation it shows, and a new one when the conversation changes, stopping the
  old one. A step still playing isn't kept.
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
