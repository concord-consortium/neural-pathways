# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and lays out the filter bar over the conversation card and the step row over the network.
  Prev/next step through the conversations the filter matches. When nothing matches, the card says
  so, and the steps and the network are left out. Under the observation notes, the card shows an
  attribute indicator for each attribute that isn't hidden.
- `trace-a-case-steps.ts`: Trace a Case on the shared step system in `src/core/steps/`: the Step
  1–4 buttons; the timeline, where Step *k* plays phase *k* of
  `src/core/network-diagram/forward-pass-phases.ts`; and the progress, the marker each conversation
  rests at in `TraceACaseState`. Reset clears the conversation shown.
- `trace-a-case-state.ts`: the view's saved state, `TraceACaseState`: the marker each
  conversation rests at, so it survives moving between conversations and switching views. Only
  this view uses it, so it lives here rather than in `src/core/state/`.

The network, the diagram, the conversation card and the data loading live in `src/core/`, where
Extract Pathways and Investigate Pathways can use them.

## Widths

The view's own width, inside the app's 16 px gutters:
- From 857 px, two columns: the card's 447 px, a 10 px gap, and the network panel's 400 px.
- Narrower, one column, down to 382 px: the diagram's narrowest layout, 380 px, and the network
  panel's border. That is the narrowest width the view is designed for.
- Narrower still, the diagram scrolls sideways inside its panel. Everything else wraps or stacks,
  and the page doesn't scroll sideways even when the view is embedded on its own 320 px wide.

## Still to come

The view still needs:
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- the activation legend;
- About.
