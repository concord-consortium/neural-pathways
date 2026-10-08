# core

Reviewed code shared by the student app (`src/app/`), the lesson views (`src/views/`) and the
dataset generator (`generator/`): data types, data loading, dataset definitions and math.

## Rules

- Every line under `src/app/`, `src/views/`, `src/core/` and `generator/` is reviewed. Code
  enters these folders only through a story's PR. The generator is reviewed because it writes
  the data students see.
- `core` imports only from `core` and packages.
- `generator` imports only from `generator`, `core` and packages.
- Nothing student-facing imports from `src/lab/` or `scripts/`, which are unreviewed, or from
  anything else outside `app`, `views` and `core`. ESLint (`import/no-restricted-paths`) enforces
  this and the generator rule; see `eslint.config.mjs`. Disabling the rule in any reviewed folder
  is itself a lint error, and `npm run lint:boundary` checks that the rule still catches
  violations.
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
- `math/`: `statistics.ts` (`mean`, `standardDeviation`, `isUsable`, `pearson`),
  `regression.ts` (`multipleRegression`, `logisticRegression`) and `matrix.ts` (the
  symmetric-matrix solvers regression uses).
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
  draws against (`network-scales.ts`). `index-passes.ts` computes a dataset index's passes and
  scales once per page.

  Three words name the same thing, each from its own side:
  - **unit:** one element of a layer, in the network's math (`network.ts`, and the `[unit]` and
    `[source unit]` indexes of a `Scene`). This is the textbook term, and the one Keras uses.
  - **node:** that unit's circle in the diagram (`network-diagram/`), with its gauge. A node's
    drawn row and its unit index can differ: `unitAt` in `network-drawing.tsx` maps one to the
    other.
  - **neuron:** what the lesson, the students and the activation analysis call it. It is the
    usual word in interpretability work, which studies what each one responds to, and the word
    the docs in `doc/` and `docs/` use.

  Use the word for the side you are on, and "neuron" in anything a student sees.
- `network-diagram/`: the shared network diagram. A view says what to show as a `Scene`, and
  `NetworkDiagram` draws it at the size of its container. `NetworkDrawing` is the same drawing as
  an SVG group, for a view that draws more around the network. `layout.ts` is its geometry;
  `easing.ts` has the timing curves; `forward-pass-phases.ts` is the four phases of a
  conversation's forward pass through the network as a function of time, which Trace a Case plays
  as its steps and Extract Pathways replays.
- `steps/`: the step system views share. A view's timeline rests at markers, points where the
  scene is still and progress is saved, and plays segments between them. `StepPlayer` plays the
  segments on a `requestAnimationFrame` clock and keeps the marker wherever the view says. A view
  lists its buttons as `StepButton`s, each saying which segment it plays when the timeline rests
  at a marker, and `StepRow` draws them with Reset. The player's scene changes on every frame of a
  run, so a view reads `player.scene` only inside a small `<Observer>` around its drawing; the
  rest of the view then doesn't re-render while a step plays.
- `conversation-card/`: the minimal conversation card. The full card will build on it.
- `conversation-text.ts`: what a conversation's text means to the lesson, such as its list of
  words (`conversationWords`). Items are plain data, so this is a function that takes the text, not
  a getter on a model.
- `filter/`: the filter over the conversations. `conversation-filter.ts` builds one flat record per
  conversation and runs a liqe query over them. Bare words search the alien text and the observer's
  notes, case is ignored, and unknown fields and unreadable queries are reported.
  `filter-bar.tsx` is the bar, which takes everything it shows as props, and `filter-help.tsx` is
  its help popover, which keeps only whether it is open. `use-conversation-filter.ts` ties them to
  the shared `query` and its volatile draft, `queryDraft`, and gives a view the ids to step
  through. The lab explorer keeps its own search: its fields differ.
- `colors.ts`, `colors.scss`, `panel.scss`, `button.scss`: the lesson's colors, the panel look, and
  how an unavailable button looks.
- `use-element-size.ts`: an element's size, kept current with a ResizeObserver.

Comments here sometimes mention the Yelp and 4-pathway alien datasets, and the lab tools and
files that use this code (the explorer's search, Codings dialog, regression panel and item panel,
and the heatmap). The code was written for the lab tools first, and the data format around Yelp.
See [doc/datasets.md](../../doc/datasets.md) for what each dataset is.
