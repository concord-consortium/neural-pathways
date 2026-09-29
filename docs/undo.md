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
  group. In the test, a reaction on the query corrected the conversation, and one undo restored
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
  run afterwards and *are* recorded. A new step also clears the redo stack.
- **Attached state.** An undo manager can take `attachedState: { save, restore }`. It saves a
  value before and after each step and restores it on undo or redo. It is meant for state
  outside the model, such as a cursor position.
- **One manager covers one tree.** `undoMiddleware(root)` records only changes under `root`, and a
  group belongs to one manager.

## The conversation correction

A view that shows a conversation calls `shared.ensureValidConversation(filteredIds)` when its
filtered list changes. If the list no longer includes the current conversation, the first one is
written back. The behavior we want from undo: after a student changes the query and the
conversation is corrected as a result, one undo restores both the old query and the old
conversation.

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

The deferred case is the trap. It records two steps: first the query change, then the
correction.
1. The first undo reverses the correction, putting back a conversation the current list doesn't
   include.
2. The effect corrects it again, and that records a new step, which clears redo.

However many times the student presses undo, nothing changes.

### Options that work

1. **Correct in the same action.** For example, `setQuery(query, filteredIds)`, or give the
   models the filter engine through a keystone context so an action can compute the list itself.
   This is the simplest and most explicit, as long as filtering is synchronous.
2. **Correct in a synchronous MobX `reaction`.** Don't use a React `useEffect`. Wrap the student's
   change in `undoManager.withGroup` to make the grouping explicit, rather than relying on reaction
   timing. Never call it from inside an outer `action` or `runInAction`.
3. **Skip recording the correction, and restore the conversation with attached state.** Record
   the correction with `withoutUndo`, and have attached state save and restore `conversationId`.
   It worked in the test, but it bends a feature meant for state outside the model. It also
   needs every undo manager that can change the list to carry the same attached state.

`withoutUndo` on its own is not an option: undoing the query leaves the corrected conversation
behind, and the student's original conversation is lost.

## Places that need changes

1. **Every view that shows a conversation.** Trace a Case, Investigate Pathways and Prediction
   Chain, and pane 1 of Investigate Unknown Pathway, call `ensureValidConversation`. Each must use
   one of the options above, never a `useEffect`.
2. **Pane 2 of Investigate Unknown Pathway.** It calls `ensureValidPane2Conversation(filteredIds,
   pane1ConversationId)`. It needs the same treatment, and its correction also depends on pane
   1's conversation, which lives in the shared tree.
3. **A query changed in a view that shows no conversation.** Correlations filters but shows no
   conversation, so the correction happens later, in whichever view the student opens next. In
   the standalone app, one student change then produces steps in two different views. Undo in
   either view can't reverse both. Correcting in a reaction that lives with the shared tree (not
   in each view) would keep the correction next to the change that caused it.
4. **Separate trees versus one undo history.** Each view's state and the shared state are
   separate roots, and a keystone undo manager covers one root. A student action that changes
   both trees can't be one undo step unless we choose one of these:
   - one undo manager over a common root, which would change the tree design;
   - coordinated managers that are always undone together;
   - our own undo built on `onPatches` across all the roots.

   Examples of actions that change both trees:
   - stepping a conversation after navigating to it;
   - commissioning a coding (shared) and selecting its chip (view).

   Decide this before building undo.
5. **Initial state shouldn't be undoable.** None of these should become undo steps:
   - corrections when a view first renders;
   - loading saved interactive state (NPW-43);
   - applying URL params (NPW-45);
   - reading the previous interactive's shared state.

   Start the undo manager after loading, or call `clearUndo()` once the initial corrections have
   run.
6. **Extract Pathways writes its progress in stages as an animation runs.** Each write from a
   timer is its own step. Decide whether an extraction can be undone at all. If it can, run it
   as a `@modelFlow` or group it with `withGroupFlow` or `createGroup`.
7. **Settings versus work.** Decide which fields are undoable:
   - `animate` and `speed` look like preferences;
   - Correlations' `mode` and `openDetail` look like navigation.

   Fields that aren't undoable can use `withoutUndo` safely, because nothing else depends on
   them.
8. **Commissioning and Reset in Investigate Unknown Pathway.** Reset clears the shared
   `commissioned` list. If it also clears the view's selected chips, it is another action that
   changes both trees (item 4).
9. **Saved undo history.** If the undo store is saved with an interactive's state, its patches
   are in the saved shape of the version they were recorded under. Migrations would then have to
   migrate patches too. CLUE hit this: it had to keep a removed property so old history could
   replay. Undo also can't cross interactives in the Activity Player: each interactive has its own
   history, so a change made in an earlier interactive can't be undone from a later one.
