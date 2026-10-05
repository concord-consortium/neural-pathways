# core

Reviewed code shared by the student app (`src/app/`) and the lesson views (`src/views/`):
data loading, types, math, generic charts.

## Rules

- Every line under `src/app/`, `src/views/` and `src/core/` is reviewed. Code enters these
  folders only through a story's PR.
- `core` imports only from `core` and packages. It never imports `app`, `views` or `lab`.
- Nothing student-facing imports from `src/lab/` or `scripts/`, which are unreviewed, or from
  anything else outside `app`, `views` and `core`. ESLint (`import/no-restricted-paths`) enforces
  this; see `eslint.config.mjs`. Disabling the rule in these folders is itself a lint error, and
  `npm run lint:boundary` checks that the rule still catches violations.
- ESLint does not see SCSS `@use` or `@import`, so a reviewer checks that stylesheets here do
  not pull in styles from `src/lab/`.

## Promoting code from `src/lab/`

Promotion is a copy-and-review, rewriting where warranted, not a blind move. When the promotion
is essentially a move, switch `lab` to import the `core` version and delete the `lab` copy. When
it is a real rewrite, the `lab` original may stay until nothing in `lab` needs it.

## What's here

- `types/`: the data format. `s3-data.ts` (the index, activation and SHAP buckets) and
  `attributes.ts`.
- `data-loader.ts`: `fetchIndex`, `fetchActivations`, `fetchShap`.
- `data-url.ts`: `dataUrl`. Every fetched data URL goes through it; see the comment there.
- `datasets/dataset-definition.ts`: what a dataset is, and attribute-key validation.
- `datasets/alien3-dataset.ts`: the lesson's dataset, `alien3Dataset`.
- `state/`: the mobx-keystone model for the shared state, any model more than one view uses, the
  setup every model imports, and the context views use to reach their state. A model only one
  view uses lives in that view's folder. What each view keeps, and the rules for changing a saved
  form, are in `docs/view-state.md`.
- `use-dataset-index.ts`: `useDatasetIndex`, which loads a dataset's index once per page and shares
  it between views.
- `network/`: the network types, the toy network Trace a Case uses until there is one built from
  the real alien3 activations (`toy-network.ts`), the forward pass, and the scales the diagram
  draws against (`network-scales.ts`).

  Three words name the same thing, each from its own side:
  - **unit:** one element of a layer, in the network's math (`forward.ts`, and the `[source unit]`
    index of a `Scene`'s `edgeDraw`). This is the textbook term, and the one Keras uses.
  - **node:** that unit's circle in the diagram (`network-diagram/`), with its gauge. A node's
    drawn row and its unit index can differ: `unitAt` in `network-diagram.tsx` maps one to the
    other.
  - **neuron:** what the lesson, the students and the activation analysis call it. It is the
    usual word in interpretability work, which studies what each one responds to, and the word
    the docs in `doc/` and `docs/` use.

  Use the word for the side you are on, and "neuron" in anything a student sees.
- `network-diagram/`: the shared network diagram. A view says what to show as a `Scene`, and
  `NetworkDiagram` draws it at the size of its container. `NetworkDrawing` is the same drawing as
  an SVG group, for a view that draws more around the network. `layout.ts` is its geometry;
  `easing.ts` has the timing curves; `pass-steps.ts` is the four steps of a conversation's pass
  through the network as a function of time, which Trace a Case plays and Extract Pathways
  replays.
- `steps/`: the step system views share. `StepPlayer` plays a view's timeline on a
  `requestAnimationFrame` clock and keeps its steps done wherever the view says. A view lists its
  buttons as `StepButton`s, each saying what it plays from the steps done, and `StepRow` draws
  them with Reset.
- `conversation-card/`: the minimal conversation card. The full card will build on it.
- `conversation-text.ts`: what a conversation's text means to the lesson, such as its list of
  words. Items are plain data, so these are functions that take the text.
- `colors.ts`, `colors.scss`, `panel.scss`: the lesson's colors and the panel look.
- `use-element-size.ts`: an element's size, kept current with a ResizeObserver.

Comments here sometimes mention the Yelp and 4-pathway alien datasets, and the lab tools and
files that use this code (the explorer's search, Codings dialog, regression panel and item panel,
and the heatmap). The code was written for the lab tools first, and the data format around Yelp.
See [doc/datasets.md](../../doc/datasets.md) for what each dataset is.
