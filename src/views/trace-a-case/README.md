# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and lays out the conversation card and the network. The network shows the whole pass
  for the current conversation.

The network, the diagram, the conversation card and the data loading live in `src/core/`, where
Extract Pathways and Investigate Pathways can use them.

## Still to come

Next come Steps 1–4, which build the pass up a layer at a time. After those, the view still needs:
- the filter;
- the label chip, observation notes and attribute icons;
- node hover and the pinned readout;
- Step 1's word flights;
- the Animate and speed controls;
- saved step progress for each conversation (`TraceACaseState`);
- the activation legend;
- About.
