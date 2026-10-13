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

## Size

The minimum layout size (see `docs/accessibility.md`) is 889 × 523 px as an Interactive, inside the
designed size of 1024 × 562.

The minimum layout width, 889 px, holds two columns: the card's 447 px, a 10 px gap, and the network
panel's 400 px make 857 px, inside the app's 16 px gutters.

The minimum layout height, 523 px, adds up from the top:
- the title and its margins, 81 px;
- a 9 px gap;
- the filter bar and the step row, 44 px;
- a 9 px gap;
- the card and network panels at their smallest, 380 px. That is the diagram's smallest layout,
  300 px (`MIN_HEIGHT` in `layout.ts`), and 80 px for the network panel's head, padding and border.

The view's 16 px bottom padding is the first thing to go as the window gets shorter, so it isn't
counted.

Narrower than its minimum layout width, it still works, but no reviewed design covers it:
- The columns stack, and the page scrolls down. It is about 1,100 to 1,250 px tall.
- Below 414 px, the diagram scrolls sideways inside its panel. That is the diagram's narrowest
  layout, 380 px, with the network panel's border and the app's gutters. Everything else wraps or
  stacks, and the page doesn't scroll sideways even at 320 px.

## Still to come

The view still needs:
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- the activation legend;
- About.
