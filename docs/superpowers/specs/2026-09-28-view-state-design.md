# View State — Design

## Overview

Decide what state each lesson view keeps, before the view stories are built. The view stories
can then use it without reshaping it. Add the types and a small store for that state.

Jira: [NPW-30](https://concord-consortium.atlassian.net/browse/NPW-30). It blocks
[NPW-43](https://concord-consortium.atlassian.net/browse/NPW-43) (sharing state between
interactives in the AP) and [NPW-45](https://concord-consortium.atlassian.net/browse/NPW-45)
(setting initial state from URL params).

**Delivery.** The whole design was built first, and is kept as the target in draft
[PR #29](https://github.com/concord-consortium/neural-pathways/pull/29). Reviewing state for views
that exist only in the prototype is hard, though, so it lands in pieces:

- **NPW-30 lands the framework:**
  - mobx-keystone and the type-checking setting;
  - `SharedState`, with only its `version`;
  - `AppState`, the context and hooks, and an optional `stateModel` on the registry;
  - the docs.
- **Each view's model, and each shared field, lands with the story that first builds UI using
  it,** so the state is reviewed against that UI.

NPW-31 (temporary state controls) is dropped. Its Playwright check, that state survives switching
views, moves to NPW-32. Wherever this spec lists the per-view models, read them as the target.

The starting point is the prototype's `SIM.saveState` blocks
([demo](https://models-resources.concord.org/demos/branch/neural-net-maker/); source is
`index.html` on the `neural-net-maker` branch of the demos repo, v1.0). This design changes that
state in five ways:

- It refers to conversations and attributes by id, not by position in a filtered list.
- The query and the current conversation are shared by all views.
- Built-in default queries are removed.
- An open About modal is not kept.
- Investigate Pathways' loading selection is kept (the prototype doesn't keep it).

After this work:

- `src/core/state/` holds the mobx-keystone model for the shared state, and the setup and context
  every view uses. Each view's model lives in that view's folder, unless more than one view uses
  it. Every model has unit tests and a saved-form fixture.
- The student app holds one state tree per view plus the shared tree, as children of one
  runtime-only root. Switching views keeps each view's state.
- Views get their state through React context.
- `docs/view-state.md` documents what each view keeps. It also records the load precedence and
  URL param format that NPW-43 and NPW-45 will implement.

## Vocabulary

| Term | Meaning |
|---|---|
| **View state** | The state one view keeps. In the AP it becomes that interactive's saved state. |
| **Shared state** | The state every view reads and writes: the query, the current conversation, the commissioned codings. |
| **Tree** | One saved piece of state. Each view's state is a tree, and the shared state is another tree. In the app they are children of one runtime-only root. |
| **Snapshot** | The JSON form of a tree, from `getSnapshot`. It is what gets saved. |

## Decisions

| Decision | Choice | Why |
|---|---|---|
| State library | **mobx-keystone** 2.2 on MobX 7 | Class models; snapshots, patches, action recording and built-in undo; runtime type checking on load. Why keystone rather than MST, and its costs, are in `docs/mobx-keystone.md`. |
| Trees | **Separate trees in both modes:** one per view, plus one shared, as children of one runtime-only root | Matches the AP, where each interactive saves its own state. Save and load work the same way in the standalone app and in the AP. One root lets an action that changes a view's tree and the shared tree be one undo step. |
| Query and conversation | **Shared** | Moving between views keeps the student on the same filter and the same case. The one exception is Investigate Unknown Pathway's second pane, which keeps its own conversation. |
| Default queries | **None in code** | Keeps the views free of lesson content. An author who wants a starting query sets it in the interactive's URL (NPW-45). |
| Showing a conversation | **Write the first matching one back if the saved id doesn't match the filter** | The next interactive opens on the same case. |
| Versions | **`version: 1`** on the shared tree and on every view tree | Migrations are deferred. With a version on every saved piece, a pass that runs before load can be added later without changing the shape. |
| `$modelType` names | **`npw/<Name>`, never renamed** | They are stored in saved student data, like view ids. |
| Decorators | **Standard** (drop `experimentalDecorators`) | MobX 7 doesn't support legacy decorators. Nothing in the repo uses them yet. |
| Scope | **Models, standalone holder, context, tests, docs** | Load precedence, URL params and AP save/load are documented here, but belong to NPW-45 and NPW-43. Nothing in NPW-30 would call them. |

## State shape

Every saved field is declared with `tProp`. That type-checks it on load and gives it the runtime
type info NPW-45's URL loader needs. Conversations and attributes are stored by id or key.
Pathway and neuron numbers are fixed by the network, so they are stored as numbers.

### Shared state: `npw/SharedState`

| Field | Type | Default | Notes |
|---|---|---|---|
| `version` | `1` | `1` | |
| `query` | `string \| undefined` | unset | Unset means no query has been set. `""` means the student cleared it. |
| `conversationId` | `string \| undefined` | unset | The current conversation in every view that shows one, and in pane 1 of Investigate Unknown Pathway. |
| `commissioned` | `string[]` | `[]` | Attribute keys, in the order they were commissioned. At most 2 (the prototype's `BUDGET`). |

Actions:

- `setQuery(query)` and `setConversationId(id)`.
- `ensureValidConversation(filteredIds)`. If `conversationId` is unset or isn't in `filteredIds`,
  set it to `filteredIds[0]`. If `filteredIds` is empty, leave it unchanged: there is nothing
  valid to write, and when the student loosens the query their conversation comes back.
- `commission(attributeKey)` does nothing if the key is already commissioned or if 2 already
  are. `resetCommissioned()` empties the list.

### View state

Each view tree has `version: 1`, plus the fields below. Each field has a setter action.

| View id | `$modelType` | Fields |
|---|---|---|
| `trace-a-case` | `npw/TraceACaseState` | `stepsByConversation: Record<conversationId, integer>` (steps done); `animate: boolean = true`; `speed: 0 \| 1 \| 2 = 1` |
| `extract-pathways` | `npw/ExtractPathwaysState` | `animate` and `speed`, with the same defaults as `trace-a-case`; `extracted: boolean = false`; `collected: integer = 0`; `cubeDone: boolean = false`; `pathwaysDone: boolean = false` |
| `investigate-pathways` | `npw/InvestigatePathwaysState` | `loadingSelection?: { kind: "pathway" \| "neuron", index: integer }` |
| `prediction-chain` | `npw/PredictionChainState` | `stepByConversation: Record<conversationId, 0–4>`; `animate`; `speed` |
| `correlations` | `npw/CorrelationsState` | `mode: "measures" \| "graphs" = "measures"`; `openDetail?: { kind: "cell", attribute: string, pathway: integer } \| { kind: "pathway", pathway: integer }` |
| `investigate-unknown-pathway` | `npw/InvestigateUnknownPathwayState` | `pane1: { selectedAttributes: string[] }`; `pane2: { conversationId?: string, selectedAttributes: string[] }` |
| `correlations-part-2` | `npw/CorrelationsState` | Same model as `correlations`, as a separate tree |

The two step maps are named differently on purpose, following the prototype. Trace a Case
records how many steps have been *done* for each conversation, and that count only goes up.
Prediction Chain records the step each conversation is *on*.

Specific actions beyond the setters:

- `setStep(conversationId, step)` on the step maps.
- `toggleAttribute(pane, key)` on Investigate Unknown Pathway.
- `ensureValidPane2Conversation(filteredIds, pane1ConversationId)`. It behaves like
  `ensureValidConversation`, but falls back to the first conversation that pane 1 isn't showing,
  or to `filteredIds[0]` when that is the only one. The two panes then open on different
  conversations, as in the prototype, wherever pane 1's conversation sits in the list. Always
  falling back to `filteredIds[1]` would put both panes on the same case whenever pane 1 shows
  the second one.

### Not kept

Hover, readouts that come from hovering a neuron, the About modal, anything in the middle of an
animation (chips in flight, a step still running), and scroll positions. Extract Pathways keeps
its completed stages (`extracted`, `collected`, `cubeDone`, `pathwaysDone`) but not a stage in
progress. Without those, the prototype came back marked as extracted but showing nothing.

### Keeping the conversation valid

A view that shows a conversation calls `ensureValidConversation` with its filtered ids when it
first renders and whenever its filtered list changes. Pane 2 of Investigate Unknown Pathway
calls `ensureValidPane2Conversation`. Correlations filters but shows no conversation, so it
doesn't call either. The next view that shows a conversation corrects the id if it no longer
matches. The filtered list depends on the filter engine (NPW-35), so NPW-30 provides and tests
the actions, and the view stories call them.

### Saved form

An interactive's saved AP state will be `{ view: <view snapshot>, shared: <shared snapshot> }`
(NPW-43). For example, the view part for Trace a Case:

```json
{ "version": 1, "stepsByConversation": { "c12": 3 }, "animate": true, "speed": 1,
  "$modelType": "npw/TraceACaseState" }
```

No model uses a `toSnapshotProcessor` that changes the saved form. The saved form is exactly the
keystone snapshot, so recorded patches, and undo history if we add it, match what is stored.

## Architecture

```
src/core/state/
  setup.ts                           AlwaysOn type checking and Set polyfills
  shared-state.ts                    SharedState model
  correlations-state.ts              a model more than one view uses (Correlations and Part 2)
  view-state-context.tsx             context + hooks views use
  *.test.ts, __fixtures__/*.json     unit tests and saved-form fixtures
src/views/<view-id>/
  <view-id>-state.ts                 a model only this view uses, e.g. trace-a-case-state.ts
  *.test.ts, __fixtures__/*.json     its unit test and saved-form fixture
src/app/state/
  app-state.ts                       holder: shared tree + view trees keyed by view id
  app-state.test.ts
```

**Where a model lives** follows the rule for `src/core/`: it holds code more than one view uses.
A model only one view uses sits in that view's folder, beside the code that reads it, so a reader
of the view finds its saved form there. The app registers it in `VIEWS`, and the app may import
from views. `docs/view-state.md` keeps the table of every view's model, so the full list of what
is saved stays in one place.

**The registry names each view's model.** `ViewDef` in `src/app/views.ts` gains a
`stateModel` field holding the view's model class. It is optional: a view that keeps no state
leaves it out.

**The holder** (`AppState`, in `src/app/state/`) is a plain class around a runtime-only root
model, which is never saved itself:

- At construction it creates the root, holding the shared tree and a tree for every view with a
  `stateModel`, from type defaults. The root is registered as the one root store
  (`registerRootStore`).
- The root's `views` type is built from `VIEWS`, with one typed prop per view id, so each id can
  hold only a tree of its own model. Adding a view model needs no other change.
- `getViewState(viewId)` returns that view's tree, the same instance every time.
- One root means a student action that changes a view's tree and the shared tree can be one undo
  step under a single keystone undo manager. Saving is unaffected: an interactive saves its view
  tree and the shared tree as separate snapshots.
- Both modes use the holder. `index.tsx` creates one for the page, outside React (its comment
  says why), and passes it to `App`. The standalone app reuses it as views switch; interactive
  mode asks it for its single view. In NPW-43, interactive mode will fill it from saved interactive state instead.

**Context.** `view-state-context.tsx` in `core` exports a provider and two hooks:

- `useSharedState()` returns the shared tree.
- `useViewState(Model)` takes the expected model class, checks the tree with `instanceof`, and
  returns it with the right type. A view asking for the wrong model throws.

`ViewContent` in `src/app/` wraps each view component in the provider, passing the trees from
the holder. Views import only from `core`, and `app` supplies the values, so the import boundary
from NPW-22 is kept.

**Dependencies:** `mobx` ^7, `mobx-keystone` ^2.2, `mobx-react-lite` ^5.1, and `core-js` for the
newer `Set` methods that keystone's types declare. In `tsconfig.json`, `experimentalDecorators` is
removed and `lib` adds `esnext.collection`. Jest compiles with the same tsconfig through `ts-jest`.

## Load precedence (documented, built later)

This part is documented in `docs/view-state.md`. It is implemented by NPW-45 (URL params) and
NPW-43 (AP save/load, previous interactive). For each field, highest first:

1. **This interactive's saved state.** If it exists, that tree is used whole.
2. **A URL param** for the field.
3. **The previous interactive's shared tree.** Only the AP has this.
4. **The type's default.**

URL param names start with the tree id, which is the view id, and use dots for nested fields:
`shared.query=…`, `shared.conversationId=…`, `trace-a-case.speed=0`,
`investigate-unknown-pathway.pane2.conversationId=…`. The params apply only when a tree is
first created:

- **Standalone app:** at startup, when every tree is created.
- **Interactive mode:** only when it has no saved state.

In interactive mode the app uses `shared.*` and its own view's params, and ignores the rest.

Saved interactive state will be loaded through a single `loadInteractiveState(json)` that
returns either the two trees or an error result, and never throws. It returns an error when the
JSON fails type checking, has an unknown `$modelType`, or has a `version` other than 1. That
version check is where a migration pass would go. NPW-43 decides what an interactive does with
an error. Simply starting fresh would overwrite the student's unreadable work on the first save.

## Error handling

- The standalone app keeps state in memory only. A reload is a fresh start, as in the prototype.
- Keystone type-checks every load and write in every environment. `src/core/state/setup.ts`
  sets `modelAutoTypeChecking` to `AlwaysOn`, so a view that sets a wrong-typed value throws, in
  production too. keystone's default would check nothing in a browser build.
- `useViewState` with the wrong model class throws, with a message naming the view id, the
  tree's `$modelType` and the requested class.

## Testing

Unit tests (Jest), in `src/core/state/` and `src/app/state/`, and beside each view's model:

- **Each model:**
  - A fresh instance has the documented defaults.
  - `fromSnapshot(getSnapshot(x))` round-trips.
  - A snapshot with a wrong-typed field is rejected on load.
- **Saved-form fixtures:** one JSON file per model in its version 1 form, committed to
  `__fixtures__/`. Each test loads the fixture and checks that `getSnapshot` gives back the same
  JSON. This is persisted student data, so the fixtures catch accidental changes to its shape.
- **`SharedState`:**
  - `ensureValidConversation` when the id is unset, not in the list, in the list, and when the
    list is empty.
  - `commission` accepts at most 2 keys and no duplicates, and keeps the order they were
    commissioned in. `resetCommissioned` empties the list.
- **View actions:**
  - `setStep` records the step under the conversation id.
  - `toggleAttribute` adds and removes a key.
  - `ensureValidPane2Conversation` falls back to the first conversation pane 1 isn't showing, or
    to the only one.
- **`AppState`:**
  - The shared tree and every view's tree are under one root store.
  - Each view's tree is of the view's model type, and a later call returns the same instance.
  - A view's slot rejects a tree of another model.
  - One undo manager on the root records a change in any view.
  - Every `VIEWS` entry resolves to a tree of its model, or to none.
  - The shared tree is the same instance across views.
- **Context:** a test component that uses `useViewState` and `useSharedState` gets the trees
  from the provider. `useViewState` throws when asked for the wrong model class.

No Playwright changes: nothing visible changes. A Jest component test checks that a view's state
survives switching views (`view-switch.test.tsx`). The Playwright check comes with NPW-32.

## Docs

- **`docs/view-state.md`**, the reference doc:
  - for each view, what it keeps, what it shares, and what is deliberately not kept;
  - the conversation-validity rule;
  - the version fields and the permanent `$modelType` names;
  - the load precedence and URL param format;
  - the planned `loadInteractiveState` contract.
- **`src/core/README.md`:** a short pointer to `src/core/state/` and the reference doc.
- **`src/app/README.md`:** the "Adding a view" steps add "create its state model in the view's
  folder, or in `src/core/state/` if another view uses it too, and set `stateModel` in
  `views.ts`".

## Out of scope

- The URL param loader (NPW-45).
- AP save/load, the previous interactive's shared state, and `loadInteractiveState` (NPW-43).
- Migrations, which are deferred. The version fields are the hook for them.
- Undo/redo.
- UI bound to the state, which comes with each view's story.
- Persisting the standalone app's state across reloads.

## Risks

- **Standard decorators with mobx-keystone under ts-jest and webpack.** mobx-keystone 2.2
  documents support for them. The first plan task should prove that a decorated model compiles
  and runs in both Jest and the webpack build before anything else is built on it.
- **`$modelType` names are permanent.** Renaming one later needs a migration. Get the names
  right in review.
