# Glossary

The names this repo has settled on, for code, comments, docs and tests. Each entry says what the
word means here and, where one was in use, the word it replaces. When a review finds two names for
one thing, or one name for two things, settle it and add it here.

## State

- **store:** write a value into the state tree, through a model action, as when the filter bar
  stores a finished query or the step player stores a marker. Undo, once built, will record it.
  Not "commit" or "set" in prose, though `onCommit` stays the filter bar's event name.
- **save:** keep the state tree as the student's data, so it can be loaded again: the Activity
  Player's save and load. A value stored in the tree is saved with it. Not "store" for this.
- **saved form:** the JSON a model saves as, which the rules in `view-state.md` protect. Not
  "saved shape".
- **draft:** the query being typed, not yet stored. It is volatile: never saved, and not for undo
  to record.

## Conversations

- **conversation:** one item of the dataset. Not "case" for a conversation: that word appears only
  in the view's name, Trace a Case.
- **place:** a conversation's index among all of them, in index order. Passes are kept by place.
- **position:** a conversation's index in the list being stepped through, which the filter decides
  (`listPosition` in Trace a Case, `position` on the conversation card).

## The step system

- **step:** a button in the step row, such as Trace a Case's Step 1 to Step 4. Not a point or a
  stretch of the timeline.
- **marker:** a point on a view's timeline where the scene rests and progress is stored. 0 is the
  start.
- **segment:** the stretch of timeline between two markers, `{ from, to }`, which a step plays.
  Not "keyframe".
- **run:** one play of a segment, started by a press. A run still playing is never stored.
- **frame:** a run at one moment: `currentFrame`, replaced on every animation frame.
- **current:** the step marked with `aria-current="step"`: the one whose run plays, or, while
  nothing plays, the one its view marks. Not "pressed", since a step isn't a toggle.

## The network diagram

- **unit:** a neuron as an index in a layer or column, as in `nodeFill[column][unit]`.
- **node:** a unit's drawn circle, with its gauge.
- **edge:** a drawn connection between two nodes, colored and weighted by its signal.
- **wire:** the gray line under an edge, drawn whether or not the edge is.
- **phase:** one of the four parts of a conversation's forward pass: the input fill, then a fan of
  edges into each later column. Trace a Case's Step *k* plays phase *k*.
- **spotlight:** `hiddenLayerSpotlight`, how strongly the hidden layers' nodes are picked out;
  everything else fades to 1 − its strength. Not "dim" for the field.
