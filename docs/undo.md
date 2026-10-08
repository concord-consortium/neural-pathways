# Adding undo

Undo isn't built yet. This doc records how mobx-keystone's undo would interact with the view
state (`docs/view-state.md`), and every place known to need changes when undo is added.

The behavior below was checked on 2026-09-29, in a throwaway script against mobx-keystone 2.2.0
and MobX 7.0.5, and by reading keystone's `undoMiddleware.ts`.

## How keystone records undo

- **Each outermost action is one undo step.** A patch recorder starts when the outermost action
  begins, and the step is written when that action finishes. Actions called from inside it join
  the same step.
- **A synchronous MobX `reaction` set off by an action joins that action's step,** even without a
  group. In the script, a reaction on the query corrected the conversation, and one undo restored
  both. This depends on MobX running reactions before keystone closes the step. When undo is
  added, pin it with a test.
- **A `@modelFlow` (keystone's async action) is one step for the whole flow.** Changes made by
  other actions while the flow waits at a `yield` get their own steps.
- **`withGroup`, `withGroupFlow` and `createGroup`** merge several separate actions into one step.
  `withGroup` isn't a MobX action. If its caller runs inside an outer `action` or
  `runInAction`, reactions fire after the group has ended and land in a step of their own.
- **`withoutUndo(fn)` is a synchronous flag.** Changes made while it is set are dropped: they are
  never recorded, so undo never reverses them.
- **`undo()` and `redo()` apply their patches with recording off.** Reactions the patches set off
  run afterward and *are* recorded. A new step also clears the redo stack.
- **Attached state.** An undo manager can take `attachedState: { save, restore }`. It saves a
  value before and after each step and restores it on undo or redo. It is meant for state
  outside the model, such as a cursor position.
- **One manager covers one subtree.** `undoMiddleware(subtreeRoot)` records only changes under
  that node, and a group belongs to one manager. The app's state has one root, with every view's
  tree and the shared tree as children, so one manager on it covers all of them.

## The conversation correction

In the target design (draft PR #29), a view that shows a conversation calls
`shared.ensureValidConversation(filteredIds)` when its filtered list changes. If the list no
longer includes the current conversation, the first one is written back. The behavior we want
from undo: after a student changes the query and the conversation is corrected as a result, one
undo restores both the old query and the old conversation.

Starting from query unset and conversation `c2`, the student sets a narrower query that doesn't
include `c2`:

| How the correction runs | After the change | After undo |
|---|---|---|
| Inside the same action as the query change | 1 step | Both restored |
| A synchronous `reaction`, no group | 1 step | Both restored |
| A synchronous `reaction`, with the change in `withGroup` | 1 step | Both restored; redo works |
| Wrapped in `withoutUndo` | 1 step (query only) | Query restored, conversation **not** |
| `withGroup` called inside an outer `runInAction` | 2 steps | Undo restores only the conversation, which isn't in the current list |
| Deferred until after render, like a React `useEffect` | 2 steps | **Stuck** (see below) |
| `withoutUndo` reaction, plus attached state holding `conversationId` | 1 step | Both restored; redo works |
| A `@modelFlow` that sets the query, awaits an async filter, then corrects | 1 step | Both restored; redo works |
| The same flow, with another change (speed) made while filtering runs | 2 steps, in the wrong order | The first undo reverses the query, not the later speed change |
| The same flow, with a second query started before the first filter finishes | 2 steps | History corrupted: undoing twice doesn't get back to the original query |

The deferred case is the trap. It records two steps: first the query change, then the
correction.
1. The first undo reverses the correction, putting back a conversation the current list doesn't
   include.
2. The effect corrects it again, and that records a new step, which clears redo.

However many times the student presses undo, nothing changes.

### Options that work

1. **Correct when the query is set (preferred).** Add an action, `setQueryAndCorrect`, that sets
   the query and corrects the conversation as one undo step. The student's query changes go
   through it, in every view, including Correlations, which then no longer leaves the
   correction to the next view. How to build it depends on whether filtering is synchronous:
   - **Synchronous filtering:** `setQueryAndCorrect(query)` computes the filtered list itself and
     calls `ensureValidConversation`. The models get the filter engine through a keystone context.
   - **Asynchronous filtering, as a `@modelFlow`:** set the query, `yield* _await(...)` the
     filter, then correct. A flow is one undo step, so undo restores both. The script found two
     catches:
     - **Undo order goes wrong.** The flow's step is written when the flow *finishes*. A
       change the student makes while filtering runs, such as the speed, lands before it in the
       undo history. The first undo then reverses the query instead of the more recent change.
     - **Overlapping flows corrupt the history.** When a second query starts before the first
       filter finishes, both flows record patches for `query`, and they finish in the opposite
       order from how they started. After undoing twice, the script showed `query=narrow`; it
       should have been back to no query at all.

     This would work only if query changes never overlap, for example with the filter bar
     disabled until filtering finishes.
   - **Asynchronous filtering, with the filter run first (recommended for async):** run the
     filter outside any action, then call a synchronous `setQueryAndCorrect(query, filteredIds)`.
     That action applies the query and the correction together in one step, so there are no
     ordering or overlap problems. The filter bar holds the typed text as UI state until the
     results arrive, and drops results for a query that has since been replaced.

   Once this exists, no student-facing code needs a bare `setQuery`. Keep it only if something
   must set a query without correcting. Loading saved state and URL params don't need it; they
   set state through snapshots.

   This is built for the filter (`src/core/filter/`). Filtering is synchronous, but it takes the
   filter-run-first shape: the view runs the filter, then calls
   `setQueryAndCorrect(query, matchingIds)`. The models don't need the filter engine.
2. **Correct in a synchronous MobX `reaction`.** Don't use a React `useEffect`. Wrap the student's
   change in `undoManager.withGroup` to make the grouping explicit, rather than relying on reaction
   timing. Never call it from inside an outer `action` or `runInAction`.
3. **Skip recording the correction, and restore the conversation with attached state.** Record
   the correction with `withoutUndo`, and have attached state save and restore `conversationId`.
   It worked in the script, but it bends a feature meant for state outside the model. It also
   needs every undo manager that can change the list to carry the same attached state.

`withoutUndo` on its own is not an option: undoing the query leaves the corrected conversation
behind, and the student's original conversation is lost.

## Places that need changes

1. **Every place the student changes the query.** Each filter bar calls `setQueryAndCorrect`
   (option 1), not `setQuery`. Views that show a conversation then stop correcting it when their
   list changes. They still check it when state arrives from outside, such as saved state, the
   previous interactive, or URL params (item 6). In the target design (draft PR #29), Trace a
   Case, Investigate Pathways, Prediction Chain and pane 1 of Investigate Unknown Pathway call
   `ensureValidConversation` when their list changes. Trace a Case follows option 1: it corrects
   only when its conversations load, and its filter bar corrects as above. With option 2 or 3
   instead, each must correct in a reaction, never a `useEffect`.
2. **Pane 2 of Investigate Unknown Pathway.** It would call `ensureValidPane2Conversation(filteredIds,
   pane1ConversationId)`. It needs the same treatment, and its correction also depends on pane
   1's conversation, which lives in the shared tree.
3. **A query changed in a view that shows no conversation.** Option 1 handles this: Correlations
   calls `setQueryAndCorrect` like every other view. Without it, the correction happens later, in
   whichever view the student opens next, so one student change produces steps in two different
   views, and undo in either view can't reverse both.
4. **Typing in the filter bar.** The bar filters live as the student types, but stores the query
   only on Enter or blur, so one undo reverses one query.
   The text being typed is `SharedState.queryDraft`, which is volatile, so undo never records it.
   When undo is added, decide what undoing a query does to a pending draft. Clearing the draft is
   probably right.
5. **One undo history across the trees.** Some student actions change both a view's tree and the
   shared tree:
   - stepping a conversation after navigating to it;
   - commissioning a coding (shared) and selecting its chip (view).

   Each must be one undo step. The trees are children of one runtime-only root in `AppState`, so
   one undo manager on that root records both changes in a single step. This was checked with
   keystone 2.2: with separate roots, each tree recorded its own step, and undoing in the view left
   the shared change in place.

   In the standalone app this makes undo one history across all views: an undo in one view can
   reverse an earlier change made in another. In the Activity Player each interactive has one
   view, so the history covers only that view and the shared tree. Separate per-view histories
   would be worse, because every view writes to the shared tree: undoing in one view could revert
   a shared change made later in another.
6. **Initial state shouldn't be undoable.** None of these should become undo steps:
   - corrections when a view first renders;
   - loading saved interactive state;
   - applying URL params;
   - reading the previous interactive's shared state.

   Start the undo manager after loading, or call `clearUndo()` once the initial corrections have
   run. Under the one root, loading a saved tree replaces a child of the root, which is itself a
   recorded change, so the order matters.
7. **Extract Pathways writes its progress in stages as an animation runs.** Each write from a
   timer is its own step. Decide whether an extraction can be undone at all. If it can, run it
   as a `@modelFlow` or group it with `withGroupFlow` or `createGroup`.
8. **A step press writes twice.** The shared step player (`StepPlayer` in
   `src/core/steps/step-player.ts`) stores the marker a run starts from when a step button is
   pressed, and the marker it ends at from a `requestAnimationFrame` tick when it finishes. Trace a
   Case's steps work this way. Unchanged, one press is two undo steps, and the second isn't tied to
   anything the student did. Group the two writes, make the completion `withoutUndo`, or record
   only the press.
9. **Settings versus work.** Decide which fields are undoable:
   - `animate` and `speed` look like preferences;
   - Correlations' `mode` and `openDetail` look like navigation.

   Fields that aren't undoable can use `withoutUndo` safely, because nothing else depends on
   them.
10. **Commissioning and Reset in Investigate Unknown Pathway.** Reset clears the shared
   `commissioned` list. If it also clears the view's selected chips, it is another action that
   changes both trees (item 5).
11. **Saved undo history.** If the undo store is saved with an interactive's state, its patches
   are in the saved form of the version they were recorded under. Migrations would then have to
   migrate patches too. CLUE hit this: it had to keep a removed property so old history could
   replay. Undo also can't cross interactives in the Activity Player: each interactive has its own
   history, so a change made in an earlier interactive can't be undone from a later one.
