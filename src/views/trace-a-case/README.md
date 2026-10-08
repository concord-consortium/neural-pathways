# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and lays out the filter bar over the conversation card and the step row over the network.
  Prev/next step through the conversations the filter matches. When nothing matches, the card says
  so, and the steps and the network are left out. The card marks the attributes that aren't hidden
  under the observation notes.
- `step-timeline.ts`: what Steps 1–4 draw at any moment, as a pure function of time.
- `step-player.ts`: `StepPlayer`, a MobX class that plays the steps for one conversation and gives
  the view the scene to draw. Under `prefers-reduced-motion` a step jumps straight to its end. Its
  tests need no React.
- `step-row.tsx`: the Step 1–4 and Reset buttons. Reset clears the conversation shown.
- `trace-a-case-state.ts`: the view's saved state, `TraceACaseState`: the steps done for each
  conversation, so they survive moving between conversations and switching views. Only this view
  uses it, so it lives here rather than in `src/core/state/`.

The network, the diagram, the conversation card and the data loading live in `src/core/`, where
Extract Pathways and Investigate Pathways can use them.

## Still to come

The view still needs:
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- the activation legend;
- About.
