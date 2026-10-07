# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and shows the conversation card.

The conversation card and the data loading live in `src/core/`, where the other views can use
them.

## Still to come

Next come the network diagram, then Steps 1–4 and Reset, with each conversation's steps kept in
the view's own state (`TraceACaseState`). After those, the view still needs:
- the filter;
- the label chip, observation notes and attribute icons;
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- the activation legend;
- About.
