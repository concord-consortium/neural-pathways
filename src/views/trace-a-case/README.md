# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and shows the conversation card.

The conversation card and the data loading live in `src/core/`, where the other views can use
them.

## Still to come

Next come the network diagram and Steps 1–4. After those, the view still needs:
- the filter;
- the label chip, observation notes and attribute icons;
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- saved step progress for each conversation (`TraceACaseState`);
- the activation legend;
- About.
