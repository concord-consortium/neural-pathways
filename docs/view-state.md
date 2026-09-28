# View state

What each lesson view keeps, what the views share, and what is deliberately not kept. Also how
that state is saved and loaded. The design and its reasons are in
`docs/superpowers/specs/2026-09-28-view-state-design.md`.

The state is held in [mobx-keystone](https://mobx-keystone.js.org) models in `src/core/state/`.
Each view's state is its own tree, and the shared state is one more tree. The student app keeps
all of them in an `AppState` (`src/app/state/app-state.ts`) for the life of the page. In the
Activity Player (AP), each interactive will save `{ view, shared }`: its own view tree and the
shared tree (NPW-43).

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
- **Keep the conversation valid.** A view that shows a conversation calls
  `shared.ensureValidConversation(filteredIds)` when it first renders and whenever its filtered
  list changes. Pane 2 of Investigate Unknown Pathway calls `ensureValidPane2Conversation`. If
  the saved conversation isn't in the list, the first one (for pane 2, the second one) is written
  back, so the next view opens on the same case. An empty list leaves the id alone. This writes
  state without a student action: when undo is added, wrap it in `withoutUndo`.
- **`$modelType` names are permanent.** They are stored in saved student data, like view ids.
  Renaming one needs a migration.
- **Every tree has `version: 1`.** There are no migrations yet. When the saved shape changes,
  raise the version and add a migration pass that runs on the JSON before it is loaded.
- **Every saved field is a `tProp`,** so it is type-checked and carries the runtime type info the
  URL param loader needs.
- **No snapshot processors that change the shape.** The saved form is exactly the keystone
  snapshot, so recorded patches match what is stored.
- **Type checking in production.** In development and tests, keystone checks every load and write
  against the types, including refinements such as "a step from 0 to 4". In production it checks
  only primitive kinds and literals (a string where a number belongs, or a speed of 5), not
  refinements or integers. Code that loads saved state must call `typeCheck` itself.

## Where initial state comes from

This is not built yet. The URL params are NPW-45, and AP save/load and the previous interactive
are NPW-43. For each field, highest first:

1. **This interactive's saved state.** If it exists, that tree is used whole.
2. **A URL param** for the field.
3. **The previous interactive's shared tree.** Only the AP has this.
4. **The type's default.**

URL param names start with the tree id and use dots for nested fields: `shared.query=…`,
`shared.conversationId=…`, `trace-a-case.speed=0`, `correlations-part-2.mode=graphs`,
`investigate-unknown-pathway.pane2.conversationId=…`. The params apply only when a tree is first
created:

- **Standalone app:** the shared tree at startup, and each view's tree on its first visit.
- **Embedded interactive:** only when it has no saved state.

An embedded interactive uses `shared.*` and its own view's params, and ignores the rest. There
are no built-in default queries. An author who wants an interactive to open on a query sets
`shared.query` in its URL.

Saved interactive state will be loaded through one function, `loadInteractiveState(json)`, which
returns the two trees or an error result and never throws. It returns an error when the JSON:

- fails `typeCheck`;
- has an unknown `$modelType`;
- has a `version` other than 1.

That version check is where a migration pass would go. Simply starting fresh after an error
would overwrite the student's unreadable work on the first save, so NPW-43 has to decide what an
interactive does instead.
