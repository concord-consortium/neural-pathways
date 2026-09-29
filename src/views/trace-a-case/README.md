# Trace a Case

The lesson's first view: follow one conversation through the network, a layer at a time.

## What's here (NPW-32)

- `trace-a-case.tsx`: the view. It loads the alien3 conversations, keeps the shared conversation
  valid, and shows the conversation card.

The conversation card and the data loading live in `src/core/`, where the other views can use
them.

## Still to come

The rest of NPW-32 adds the network diagram and Steps 1–4. NPW-23 and the shared stories add:
- the filter (NPW-35);
- the label chip, observation notes and attribute icons (NPW-36);
- node hover and the pinned readout;
- Step 1's word flights;
- Animate and speed (NPW-38);
- saved step progress for each conversation (`TraceACaseState`);
- the activation legend;
- About (NPW-44).
