# View state

What each lesson view keeps, what the views share, and what is deliberately not kept. Also how
that state is saved and loaded. The design and its reasons are in
`docs/superpowers/specs/2026-09-28-view-state-design.md`. Undo isn't built. What it would need
from this state, and the places that would have to change, are in [undo.md](undo.md).

The state is held in [mobx-keystone](https://mobx-keystone.js.org) models in `src/core/state/`.
Each view's state is its own tree, and the shared state is one more tree. The student app keeps
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

## Shared state (`npw/SharedState`)

| Field | Meaning |
|---|---|
| `query` | The filter query every view uses. Unset: no query has been set. `""`: the student cleared it. |
| `conversationId` | The current conversation, in every view that shows one. Also pane 1 of Investigate Unknown Pathway. |
| `commissioned` | Attribute keys the student commissioned in Investigate Unknown Pathway, in order, at most 2. Correlations Part 2 reads them. |

## Each view's state

| View | Model | Keeps |
|---|---|---|
| Trace a Case | `npw/TraceACaseState` | Steps done for each conversation, by id; Animate on/off; speed (0 slow, 1 normal, 2 fast) |
| Extract Pathways | `npw/ExtractPathwaysState` | Animate; speed; the extraction stages completed (`extracted`, `collected`, `cubeDone`, `pathwaysDone`) |
| Investigate Pathways | `npw/InvestigatePathwaysState` | The selected pathway or neuron whose loadings are shown |
| Prediction Chain | `npw/PredictionChainState` | The step each conversation is on (0 to 4), by id; Animate; speed |
| Correlations | `npw/CorrelationsState` | Measures or Graphs; the open detail card, by attribute key and pathway number |
| Investigate Unknown Pathway | `npw/InvestigateUnknownPathwayState` | The chips selected on each pane; pane 2's conversation |
| Correlations Part 2 | `npw/CorrelationsState` | The same as Correlations, in its own tree |

Views get their state with `useViewState(Model)` and `useSharedState()` from
`src/core/state/view-state-context.tsx`.

## Deliberately not kept

Hover and anything shown only on hover, the About modal, scroll positions, and anything in the
middle of an animation, such as chips in flight or a step still running. Extract Pathways keeps
the stages it has completed, but not one in progress.

## Rules

- **Store ids, not positions.** Conversations are stored by id and attributes by key. A position
  in a filtered list changes whenever the query changes. Pathway and neuron numbers are fixed by
  the network, so they are stored as numbers.
- **Keep the conversation valid.** A view that shows a conversation is to call
  `shared.ensureValidConversation(filteredIds)` when it first renders and whenever its filtered
  list changes. If the saved conversation isn't in the list, the first one is written back, so
  the next view opens on the same case. Pane 2 of Investigate Unknown Pathway is to call
  `ensureValidPane2Conversation(filteredIds, shared.conversationId)`, which falls back to the
  first conversation pane 1 isn't showing, so the panes open on different cases. An empty list
  leaves the id alone.
- **`$modelType` names are permanent.** They are stored in saved student data, like view ids.
  Renaming one needs a migration.
- **Every tree has `version: 1`.** There are no migrations yet. When the saved form changes,
  raise the version and add a migration pass that runs on the JSON before it is loaded.
- **Every saved field is a `tProp`,** so it is type-checked and carries the runtime type info the
  URL param loader needs.
- **No snapshot processors that change the shape.** The saved form is exactly the keystone
  snapshot, so recorded patches match what is stored.
- **Type checking is on everywhere, production included.** `src/app/state/app-state.ts` sets
  `modelAutoTypeChecking` to `AlwaysOn`. Every load and write is checked against the types,
  including values inside arrays, records and objects, and refinements such as "a step from 0 to
  4". A bad value throws where it is written, so it never reaches saved student state. The
  trees are small, so the cost is negligible.

  Keystone's default, `DevModeOnly`, would turn these checks off in every browser build, the dev
  server included, not only in production. keystone decides it is in dev mode with
  `typeof process !== "undefined"`, and webpack 5 doesn't define `process` in browser bundles.
  With the checks off, bad data loads silently: `commissioned: [5]`,
  `stepsByConversation: { "…": "3" }`, or `pane2: {}` (which loads without `selectedAttributes`,
  so `toggleAttribute` then crashes). Code that uses these models outside the student app must
  turn the setting on itself.

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

- fails `typeCheck` against the expected model, as in `typeCheck(types.model(TraceACaseState), view)`.
  This check is needed even when `fromSnapshot` succeeds with type checking on. A snapshot whose
  `$modelType` names a different registered model loads as that other class:
  `fromSnapshot(TraceACaseState, …)` given Correlations state returns a `CorrelationsState`.
  `typeCheck`, or an `instanceof` check, catches it, and so does putting the tree in its slot
  under `AppState`'s root, which throws a type error. This was reported as
  [mobx-keystone #590](https://github.com/xaviergonz/mobx-keystone/issues/590);
- has an unknown `$modelType`;
- has a `version` other than 1.

Keystone behaves in three more ways the loader has to allow for:

- **Fields the model doesn't declare are kept,** pass `typeCheck`, and are saved again. A
  misspelled field (`animat: false`) is therefore not an error: the real field keeps its default,
  and the misspelled one lingers.
- **A snapshot with no `version`** loads as version 1, through the default.
- **The commission budget** is enforced only by `commission()`. A saved list with three keys
  loads.

That version check is where a migration pass would go. Simply starting fresh after an error
would overwrite the student's unreadable work on the first save, so AP save/load has to decide
what an interactive does instead.
