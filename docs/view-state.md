# View state

How the lesson views keep their state: what each view keeps, what the views share, what is
deliberately not kept, and how state is saved and loaded. The design and its reasons are in
`docs/superpowers/specs/2026-09-28-view-state-design.md`. Undo isn't built. What it would need
from this state, and the places that would have to change, are in [undo.md](undo.md).

The state is held in [mobx-keystone](https://mobx-keystone.js.org) models. Each view's state is
its own tree, and the shared state is one more tree. The student app keeps
all of them as children of one root, in an `AppState` (`src/app/state/app-state.ts`), for the
life of the page:
- **One root:** a student action that changes a view's state and the shared state can then be one
  undo step (see [undo.md](undo.md)).
- **Created at startup:** every view's tree is created when the app starts, from the view's
  `stateModel` in `VIEWS`. The root's type is built from `VIEWS` too, so each view id can hold only
  a tree of its own model.
- **Never saved whole:** the root is runtime only. What is saved is a view's tree and the shared
  tree, each as its own snapshot.

`index.tsx` creates the `AppState` once, outside React; its comment explains why. In the Activity
Player (AP), each interactive will save `{ view, shared }`: its own view tree and the shared tree.

## How the state arrives

The framework is in place: `SharedState`, `AppState`, and the context views use. Trace a Case and
Extract Pathways have their state models. Each view's model, and each shared field, arrives with the
story that first builds the UI using it, so it can be reviewed against that UI. The complete
target is kept in draft [PR #29](https://github.com/concord-consortium/neural-pathways/pull/29).
Bring a view's model over from it, and change the model if the UI turns out to need something
different. The tables below list that target and the story each piece is expected to arrive with.

Where the models live follows the rule for `src/core/`: it holds what more than one view uses.

- **`src/core/state/`:** the shared state's model, the setup every model imports, the context and
  hooks views use, and any model or piece of one that more than one view uses. Correlations and
  Correlations Part 2 share one model, so theirs goes here.
- **The view's own folder:** a model only that view uses, beside the code that reads it, with its
  test and fixture.

To give a view its state:

1. Create its model, with `version: 1` and a new `npw/<Name>State` `$modelType`, in the place the
   list above gives. Declare every saved field with `tProp`. Import `src/core/state/setup.ts`
   first, as `shared-state.ts` does.
2. Add a saved-form fixture in a `__fixtures__/` folder beside the model, and a test that loads it
   and saves it back unchanged. Copy the pattern from `shared-state.test.ts`.
3. Set `stateModel` on the view's entry in `VIEWS` (`src/app/views.ts`).
4. In the view, read the state with `useViewState(Model)`, and the shared state with
   `useSharedState()`. Both come from `src/core/state/view-state-context.tsx`. Wrap every
   component that reads state in `observer` from `mobx-react-lite`. Context doesn't re-render on
   a model change, because the tree it holds stays the same object, so without `observer` a view
   shows stale values. In development, the hooks warn once per view when they are called outside
   an `observer` component.
5. Update the tables below.

A view without a `stateModel` can still use `useSharedState()`. Calling `useViewState` in it
throws.

## Shared state (`npw/SharedState`)

It has `version`, `query` and `conversationId` so far. Its fields:

| Field | Meaning | Arrives with |
|---|---|---|
| `conversationId` | The current conversation, in every view that shows one. Also pane 1 of Investigate Unknown Pathway. A view that shows one calls `ensureValidConversation` when its list arrives or changes. | In place |
| `query` | The filter query every view uses, stored when the student presses Enter or leaves the filter bar. Unset: no query has been set. `""`: the student cleared it. | In place |
| `commissioned` | Attribute keys the student commissioned in Investigate Unknown Pathway, in order, at most 2. Correlations Part 2 reads them. | Investigate Unknown Pathway |

`SharedState` also has one volatile field, `queryDraft`: the filter bar's text while it differs
from `query`. Filtering follows the draft as the student types, but only `setQueryAndCorrect`
stores a query and corrects the conversation. The draft lives in the shared state so that every
view's filter bar shows the same text, and so a half-typed query survives switching views. It is
volatile (`@observable accessor`, not a `tProp`): it is never saved, never in a snapshot, and never
an undo step.

## Each view's state

Trace a Case's and Extract Pathways' are built so far: Trace a Case's with the marker each
conversation rests at, and Extract Pathways' with its first two stages, both with Animate and
speed. The target, with what is built marked:

| View | Model | Keeps |
|---|---|---|
| Trace a Case | `npw/TraceACaseState` | The marker each conversation rests at (its steps done, 0 to 4), by id (built); Animate on/off (built); speed (0 slow, 1 normal, 2 fast) (built) |
| Extract Pathways | `npw/ExtractPathwaysState` | Whether Setup is done (`setupDone`) and how many conversations are collected (`collected`) (built); Animate (built); speed (built); the later stages (`cubeDone`, `pathwaysDone`) |
| Investigate Pathways | `npw/InvestigatePathwaysState` | The selected pathway or neuron whose loadings are shown |
| Prediction Chain | `npw/PredictionChainState` | The step each conversation is on (0 to 4), by id; Animate; speed |
| Correlations | `npw/CorrelationsState` | Measures or Graphs; the open detail card, by attribute key and pathway number |
| Investigate Unknown Pathway | `npw/InvestigateUnknownPathwayState` | The chips selected on each pane; pane 2's conversation |
| Correlations Part 2 | `npw/CorrelationsState` | The same as Correlations, in its own tree |

The views with an Animate toggle share the `animate` and `speed` props (`animationProps` in
`src/core/state/animation.ts`) and the `Animated` interface, so one set of controls,
`AnimationControls`, drives any of them. Prediction Chain will be the third.

## Deliberately not kept

Hover and anything shown only on hover, the About modal, scroll positions, and anything in the
middle of an animation, such as chips in flight or a step still running. Extract Pathways keeps
the stages it has completed, but not one in progress. A query still being typed is kept only for
the life of the page, in `SharedState.queryDraft`.

## Rules

- **Store ids, not positions.** Conversations are stored by id and attributes by key. A position
  in a filtered list changes whenever the query changes. Pathway and neuron numbers are fixed by
  the network, so they are stored as numbers.
- **Keep the conversation valid.** When a filtered list stops including the current
  conversation, the first one in the list is written back, so the next view opens on the same
  case. Pane 2 of Investigate Unknown Pathway falls back to the first conversation pane 1 isn't
  showing, so the panes open on different cases. An empty list leaves the id alone.
  `SharedState.ensureValidConversation` does this for the current conversation. The draft adds
  `ensureValidPane2Conversation` for pane 2.
- **`$modelType` names are permanent.** They are stored in saved student data, like view ids.
  Renaming one needs a migration.
- **Filter field names are part of the saved form.** A stored `query` names fields such as
  `model_correct` and `pathway_1`, so renaming a field or renumbering the pathways changes what a
  saved query means. A query naming a field the filter no longer has shows its error and lists
  every conversation. `n` is a position among all the conversations, not in a filtered list, so it
  holds only while the dataset index keeps its order.
- **Every tree has a `version`, starting at 1.** There are no migrations yet.
  - Adding a field with a default doesn't change the version. Older saved state loads, and the
    new field gets its default.
  - Renaming, removing or retyping a field, or moving data, does. It needs a migration pass that
    runs on the JSON before it is loaded.
- **Every saved field is a `tProp`,** so it is type-checked and carries the runtime type info the
  URL param loader needs.
- **No snapshot processors that change the shape.** The saved form is exactly the keystone
  snapshot, so recorded patches match what is stored.
- **Type checking is on everywhere, production included.** `src/core/state/setup.ts` sets
  `modelAutoTypeChecking` to `AlwaysOn`, and every model file imports it, so any code that uses the
  models gets it. Every load and write is checked against the types, including values inside
  arrays, records and objects, and refinements such as "a step from 0 to 4". A bad value throws
  where it is written, so it never reaches saved student state. The trees are small, so the cost
  is negligible.

  Keystone's default, `DevModeOnly`, would turn these checks off in production builds, which is
  where saved student state is loaded. With the checks off, bad data loads silently:
  `commissioned: [5]`,
  `markerByConversation: { "…": "3" }`, or `pane2: {}` (which loads without `selectedAttributes`, so
  the first change to it crashes).

## Where initial state comes from

This is not built yet: neither the URL param loader nor AP save/load, which brings the previous
interactive's shared tree. For each field, highest first:

1. **This interactive's saved state.** If it exists, that tree is used whole.
2. **A URL param** for the field.
3. **The previous interactive's shared tree.** Only the AP has this.
4. **The type's default.**

URL param names start with the tree id and use dots for nested fields: `shared.query=…`,
`shared.conversationId=…`, `trace-a-case.speed=0`, `correlations-part-2.mode=graphs`,
`investigate-unknown-pathway.pane2.conversationId=…`. The params apply only when a tree is first
created:

- **Standalone app:** at startup, when every tree is created.
- **Interactive mode:** only when it has no saved state.

In interactive mode the app uses `shared.*` and its own view's params, and ignores the rest. There
are no built-in default queries. An author who wants an interactive to open on a query sets
`shared.query` in its URL.

Saved interactive state will be loaded through one function, `loadInteractiveState(json)`, which
returns the two trees or an error result and never throws. It returns an error when the JSON:

- doesn't load with `fromSnapshot(Model, json)`, which throws:
  - a `TypeCheckError` for a wrong-typed value, since type checking is always on;
  - a `SnapshotTypeMismatchError` for the saved state of a different model, such as Correlations
    state loaded as `TraceACaseState`. Before mobx-keystone 2.3.0 this returned the other model
    instead ([mobx-keystone #590](https://github.com/xaviergonz/mobx-keystone/issues/590)).
    `shared-state.test.ts` checks it;
- has an unknown `$modelType`;
- has a `version` other than the model's.

Keystone behaves in three more ways the loader has to allow for:

- **Fields the model doesn't declare are kept,** pass `typeCheck`, and are saved again. A
  misspelled field (`animat: false`) is therefore not an error: the real field keeps its default,
  and the misspelled one lingers.
- **A snapshot with no `version`** loads as version 1, through the default.
- **Limits enforced only by an action,** such as at most 2 commissioned codings, aren't checked
  on load.

That version check is where a migration pass would go. Simply starting fresh after an error
would overwrite the student's unreadable work on the first save, so AP save/load has to decide
what an interactive does instead.
