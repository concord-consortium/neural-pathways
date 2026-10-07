# Filter: Query Language, Filter Bar and Help Pane — Design

## Overview

The shared filter over the 800 conversations, added to Trace a Case. A student types a query, the
count shows how many conversations match (or why the query can't be read), and prev/next step
through only the matches. Every view except Extract Pathways will use the filter. This story adds
it to Trace a Case only; the other views add it in their own stories.

Jira: [NPW-35](https://concord-consortium.atlassian.net/browse/NPW-35). It is blocked by NPW-29
(alien3 data in core) and NPW-30 (state framework). It is based on `main` and uses nothing NPW-33
adds, so it can be demonstrated in Trace a Case without waiting for Extract Pathways. Whichever of
the two merges second will have text conflicts in `trace-a-case.tsx`, `trace-a-case.scss`, the
Trace a Case README and `docs/view-state.md`, not design ones.

The text box is for advanced users. A graphical way to build a query, the Filter Options popover
(NPW-42), is what most students are expected to use. That is why the operators stay uppercase-only
and the error messages are short and technical.

Sources:
- The prototype's `makeFilter` and `buildBar` in `index.html` on the `neural-net-maker` branch of
  the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/)).
- The lab explorer's search: `src/lab/explorer/components/search-input.tsx`, its filtering in
  `src/lab/explorer/components/app.tsx`, and its spec,
  `docs/superpowers/specs/2026-04-06-explorer-search-design.md`.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Query engine | liqe, with a pass over its parsed query that sends bare words to `text` and `observation`, lowercases values, rejects unknown fields and checks comparison values. | liqe is already a dependency and the explorer uses it. Out of the box, a bare word matches every string field (`wait` matches `target_label:wait`), an unknown field silently matches nothing, and `pathway_1:>abc` throws only when filtering runs. |
| Where the code lives | `src/core/filter/`: one engine file, the bar and help components, and a hook. | Every view but Extract Pathways will filter. The explorer keeps its own copy; its field set is different (fit-specific `pathway_0…`, Yelp fields, pathway prediction). Switching it onto the core engine would change its behavior, so it is not part of this story. |
| The engine is one file | `conversation-filter.ts` holds both the lesson's records and the liqe handling. | Splitting a generic query layer out for the explorer isn't worth it until the explorer actually switches. |
| When typed text becomes the query | Filtering is live, as in the explorer: the count, the list and the conversation shown follow every keystroke. The query is stored on Enter or blur. | Stored on every keystroke, partial queries (`m` on the way to `model_correct:0`) would move the stored conversation for good, and every keystroke would be an undo step (`docs/undo.md`, item 4). |
| The text being typed | Kept in volatile state on `SharedState`, `queryDraft`, while it differs from `query`. Never saved, never an undo step. | A student may switch to another view to look something up while writing a query. Volatile state keeps the draft for the life of the page, and every view's bar shows the same draft. |
| Correcting the conversation | `setQueryAndCorrect(query, ids)`: the view runs the filter first, then one action stores the query and corrects the conversation. | `docs/undo.md` option 1, the "filter run first" variant. Filtering 800 records is synchronous, so the models don't need the engine through a keystone context. |
| An unreadable query | The count shows the error. The list falls back to the stored query's matches. An unreadable draft is never stored. | A half-typed query doesn't throw the student back to 800, and nothing unreadable reaches saved state from the bar. |
| Operators | Uppercase only: `AND`, `OR`, `NOT`, as in Lucene and the explorer. Lowercase are search words, with no special handling. | The text box is for advanced users; the help says so. Keeping lowercase as plain words keeps the code simple, though a lowercase `or` matches inside most notes and narrows the results. |
| The observer's notes | Searchable: an `observation` field, and bare words search both the alien text and the notes. `text:` or `observation:` searches only one. | Searching them can lead to the planted bias, which is acceptable: reading the notes is how students are meant to find it. |
| Case | Ignored, quoted or not: the records' text and notes, and every query value, are lowercased. A `/regex/` is the exception: it is matched as written. | liqe matches a quoted value case-sensitively, and the notes start sentences with capitals. |
| Substring matching | Kept, for the notes too: `water` also matches "underwater". | Predictable, and consistent with the rest of the filter. Whole-word matching can come later. |
| Filterable attributes | The ones not marked `hidden` in the data. The four hidden ones (`resource_stressed`, `gestures_repeated`, `young_present`, `carrying_burden`) are unknown fields. | The ticket's open question. The prototype hid only `resource_stressed`, but no other view shows the other three before they are commissioned. The engine takes the list as an input, so NPW-41 only adds the commissioned ones. |
| No matches | The bar stays and shows "0 of 800". The card's cell says "No conversations match the filter." The steps row and the network are left out. The stored conversation is unchanged. | Loosening the query brings back the same conversation, at the same step. |
| The help pane | A popover opened from an ⓘ button in the bar. | The prototype's screens without the Options panel do this, and so does the explorer. NPW-42 can point the button at the Options popover on Trace a Case. |

## Verified behavior

Checked on 2026-10-06 with throwaway scripts.

**liqe 3.8.5:**
- `model_correct:0`, `pathway_1:>2`, `pathway_1:>-1`, `group_size:>=5`, `n:2`, `id:361e`
  (case-insensitive substring), `text:yand`, `"blikka"`, `-yandor`, `NOT yandor`, parentheses,
  `yan*`, `/yan/` and `group_size:[2 TO 4]` all work. Two terms with only a space between them
  are ANDed.
- A bare word matches every string field. `wait` matched a record whose `target_label` was `wait`.
- `bogus:1` parses and matches nothing.
- `field:number` matches the number as text: `n:1` matches 1, 10–19, 21 and so on. A fixture needs
  more than nine records to show this.
- `not yandor` and `yandor or sooma` treat the lowercase word as a search word. A bare word is a
  substring match, so on the real data this narrows rather than failing: `or` is inside the text or
  notes of 795 of the 800 conversations, and `yandor or sooma` gives 210, the same as
  `yandor sooma` (`yandor OR sooma` gives 560). Kept as it is, for simplicity (see Decisions).
- `(model_correct:0`, `a AND`, `NOT` and `AND` throw `Error: Found no parsings.`
- `model_correct:0)` and `OR yandor` throw a `SyntaxError` with `offset`, `line` and `column`.
- `pathway_1:>abc` parses, then `filter` throws `TypeError: Expected a number.`
- `""` and `"  "` throw `Error: Expected left to be defined.`
- None of the 30 alien3 words is `and`, `or`, `not` or `to`.

**mobx-keystone 2.3.1, with this repo's standard decorators:**
- `@observable accessor queryDraft` on a keystone model is observable, absent from
  `getSnapshot`, emits no patches and records no undo step.
- It can be cleared inside a `@modelAction`. Undoing that action doesn't restore it.
- A bare assignment outside an action works but warns under MobX strict mode, so it is set
  through a MobX `@action`. (`@observable` without `accessor` fails with these decorators.)

**The data:** in alien3, 64 of the 800 conversations have `model_correct:0`. Pathway scores run
about −4.8 to 4.8, and 17–22 conversations score above 2 on each pathway.

## The engine: `src/core/filter/conversation-filter.ts`

```ts
interface ConversationFilter {
  /** The field names a query can use, in the order the help lists them. */
  fields: readonly string[];
  /** The attributes behind the attribute fields, for the help's labels and ranges. */
  attributes: readonly AttributeDefinition[];
  /** Every conversation's id, in dataset order. */
  allIds: readonly string[];
  run(query: string): FilterResult;
}
type FilterResult = { ids: readonly string[] } | { error: string };

function createConversationFilter(
  datasetIndex: S3Index,
  dataset: DatasetDefinition,
  attributes: readonly AttributeDefinition[],
): ConversationFilter;

/** The alien3 filter for a loaded index, cached per index. */
function conversationFilterFor(datasetIndex: S3Index): ConversationFilter;
```

### Records

One flat record per conversation, built once when the filter is created:

| Field | Value |
|---|---|
| `n` | The conversation's position in `datasetIndex.items`, counting from 1. It doesn't shift when the filter narrows the list. |
| `id` | `item.id` |
| `text` | `item.text`, lowercased, with newlines replaced by spaces, so a quoted phrase can span turns |
| `observation` | `item.observation`, lowercased: the observer's notes in English |
| `target_label` | `item.target_label` |
| each attribute key | `dataset.getAttributeValue(item, key)` |
| `pathway_1` … `pathway_N` | `item.pathway_scores[fit][k - 1]`, where `fit` is the index's one fit (`alien-fa-3` in alien3) and `N` is its `n_pathways`. Numbered from 1, as in the lesson. |

A `null` value is left out of the record, as in the explorer: `field:value` never matches it, so
`NOT field:value` always does.

`fields` is `n`, `id`, `text`, `observation`, `target_label`, then the attribute keys in the order of
`attributes`, then `pathway_1` to `pathway_N`.

`conversationFilterFor` passes `alien3Dataset` and
`alien3Dataset.resolveAttributes(datasetIndex)` without the `hidden` ones. That list already
includes the derived `target`, `prediction` and `model_correct`. The result is cached in a
`WeakMap` keyed on the index. `useDatasetIndex` shares one index object per page, so a view's load
correction and its body use the same records. NPW-41 will add the commissioned keys to the cache
key.

### `run(query)`

1. A query that is empty or only whitespace matches every conversation.
2. Parse the query with liqe's `parse`.
3. Walk the parsed query once:
   - A tag with an implicit field (a bare word) becomes `(text:word OR observation:word)`.
   - A string value is lowercased, to match the lowercased records.
   - A field name not in `fields` is an error.
   - A comparison (`:>`, `:<`, `:>=`, `:<=`) whose value isn't a number is an error.
4. Filter the records with liqe's `filter`, and return the matching ids in dataset order.

Matching is liqe's. On a string field, `field:value` is a substring match, and case doesn't matter.
On a number field, `field:number` is rewritten as the range `[number TO number]`, so it is
equality: liqe on its own matches a number as text, and `n:1` gave 233 conversations (every `n`
with a 1 in it). Quotes, `*` wildcards, `/regex/` and `[a TO b]` ranges also work. The help
doesn't list them. A `/regex/` isn't rewritten: it is case-sensitive, it matches a number field's
value as text, and a bad pattern shows the browser's own error.

### Error messages

| Cause | Message |
|---|---|
| A field not in `fields`, including a hidden attribute | `Unknown field: bogus` |
| A comparison without a number | `pathway_1:> needs a number` (the field and operator typed) |
| A word given to a number field (`n`, an attribute, a pathway), such as `model_correct:no` | `model_correct needs a number`. Without it the query matches nothing: the records hold 0 and 1, not the value labels. |
| liqe's `Found no parsings.`: a trailing `AND`, an unclosed `(`, a lone `NOT` | `Incomplete query` |
| A field with no value, such as `pathway_1:`. liqe would match nothing, and Enter would store it. | `Incomplete query` |
| liqe's `SyntaxError` | `Can't read the query at column 16` (liqe's `column`) |
| Anything else liqe throws | its message |

A hidden attribute gets the same message as a typo, so the error doesn't hint that it exists.

## Shared state: `src/core/state/shared-state.ts`

New members:

```ts
/** The filter query every view uses. Unset: no query has been set. "": the student cleared it. */
query: tProp(types.maybe(types.string)),

/** Volatile: the filter bar's text while it differs from `query`. Not saved, not undoable. */
@observable accessor queryDraft: string | undefined = undefined;

/** Clears the draft instead when `text` equals `query ?? ""`. */
@action setQueryDraft(text: string): void;

/** Escape in the filter bar. */
@action discardQueryDraft(): void;

/** Stores the query, clears the draft and corrects the conversation, in one action. */
@modelAction setQueryAndCorrect(query: string, ids: readonly string[]): void;
```

`setQueryAndCorrect` calls `ensureValidConversation(ids)`. As one action, it will be one undo step
when undo is built. There is no bare `setQuery`: `docs/undo.md` says nothing student-facing needs
one, and saved state and URL params set state through snapshots.

`query` is a new field with a default, so the version stays 1. The saved-form fixture gains a
`query`.

## The bar and the help: `src/core/filter/`

### `filter-bar.tsx`

`FilterBar` takes plain props and doesn't read the shared state, so it can be tested without a
store:

```ts
interface FilterBarProps {
  text: string;
  status: { matched: number; total: number } | { error: string };
  fields: readonly string[];
  attributes: readonly AttributeDefinition[];
  onTextChange: (text: string) => void;
  onCommit: () => void;
  onDiscard: () => void;
}
```

- A `<label>` "Filter", tied to the input.
- An `<input type="text">`:
  - placeholder `Example: model_correct:0`;
  - `autocomplete="off"`, `spellcheck="false"`;
  - `aria-invalid` when `status` is an error;
  - `aria-describedby` pointing at the count.
- Enter calls `onCommit`, and so does focus leaving the bar. Moving focus within the bar, to the
  ⓘ button or into the help, doesn't commit, so checking the help mid-query doesn't store a
  half-typed query. The ⓘ and × buttons don't take focus on mousedown, and the help is focusable.
  Escape calls `onDiscard`, unless the help is open.
- The count, `aria-live="polite"`:
  - `800` when every conversation matches;
  - `64 of 800`, or `0 of 800`;
  - the error message.
- The look follows the prototype: a white label at the start, a gray field, and a white tail
  holding the count and the ⓘ button. It is 44px high and uses the core colors. An error changes
  the bar's style.

### `filter-help.tsx`

The ticket's "static help pane", as a popover:

- Opened from an ⓘ button in the bar's tail, with `aria-label="Show what you can filter on"` and
  `aria-expanded`.
- The popover is `role="dialog"`. It closes on the ⓘ button again, an × button, Escape wherever
  focus is, or a mousedown outside it. While it is open, the first Escape only closes it. Escape and
  × return focus to the ⓘ button, unless focus is in the box, where it stays.
- **Fields:** a table built from `fields`:
  - `n`: Position among all the conversations, from 1.
  - `id`: The conversation's id.
  - `text`: The conversation's alien words. A bare word searches these and the observation.
  - `observation`: The observer's notes.
  - `target_label`: `approach` or `wait`.
  - each attribute: its `label`, with `min`–`max` for an integer attribute.
  - `pathway_k`: Score on Pathway k.
- **Operators:** `field:value`; `field:>value`, and `<`, `>=`, `<=`; `AND`, `OR`, `NOT`; `-word`;
  `( )`; `"quoted phrase"`. A note says the operators must be uppercase.
- **Examples:** `model_correct:0`, `pathway_1:>2`, `yandor`, `observation:"stores nearby"`,
  `voices_raised:1 AND pathway_1:<0`,
  `NOT near_water:1`, `n:127`.

### `use-conversation-filter.ts`

```ts
function useConversationFilter(filter: ConversationFilter): {
  /** The conversations the view steps through. */
  ids: readonly string[];
  bar: FilterBarProps;
};
```

Called from an `observer` component. It reads `shared.query` and `shared.queryDraft`:

- **Text:** `queryDraft ?? query ?? ""`.
- **Ids,** the first that applies:
  1. the draft's matches, if there is a draft and it can be read;
  2. the stored query's matches, if it can be read;
  3. all ids.

  Each `run` is memoized by its query string.
- **Status:** the draft's error, if any; otherwise the stored query's error, if any; otherwise
  `{ matched: ids.length, total: allIds.length }`.
- **`onCommit`:** does nothing without a draft or with an unreadable one. Otherwise
  `shared.setQueryAndCorrect(draft, draftIds)`.
- **`onTextChange`:** `shared.setQueryDraft(text)`. **`onDiscard`:** `shared.discardQueryDraft()`.

## Trace a Case: `src/views/trace-a-case/trace-a-case.tsx`

- **On load:** `onLoaded` corrects the shared conversation against the stored query's matches,
  or all ids if the stored query can't be read. A pending draft never moves the stored
  conversation.
- **The body:**
  - calls `useConversationFilter(conversationFilterFor(index))`;
  - shows `validConversationId(shared.conversationId, ids)`, without writing it, as it does now;
  - gives the card its position and total within `ids` ("3 / 64"); prev/next step through `ids`;
  - always renders the bar, in the grid's empty cell above the card, as `trace-a-case__filter`.
- **No matches:** the card's cell shows a panel, "No conversations match the filter." The steps
  row and the network are left out, and no player is made. An index with no items at all still
  shows the existing `No conversations.`
- **Prev/next during a draft:**
  - A mousedown on Next takes focus off the input, which commits the draft before the click
    arrives. Tabbing to the button does the same.
  - The committed ids, and the corrected conversation, are the ones the screen was already showing
    from the draft. So the click's position is right whether or not React re-rendered in between.
  - Nothing else in Trace a Case writes the conversation.
- **Steps:**
  - They are kept per conversation, so a conversation the filter hides and later brings back
    returns at the step it reached.
  - If a step is playing on a conversation the draft hides, the existing layout effect stops it
    when the player changes.

## Testing

### Jest

- **`conversation-filter.test.ts`**, against a small fixture index:
  - **The records:**
    - `n` counts from 1;
    - newlines become spaces;
    - a `null` value is left out;
    - pathways are numbered from 1;
    - hidden attributes are absent;
    - `fields` is in the documented order.
  - **`run`:**
    - an empty or whitespace query matches everything;
    - the ticket's examples (`model_correct:0`, `pathway_1:>2`, a plain word, and combinations
      with `AND`, `OR`, `NOT`, `-` and parentheses);
    - a bare word matches the alien text or the notes, and nothing else: `wait` doesn't match a
      `target_label` of `wait`; `text:` and `observation:` search only one;
    - case is ignored, quoted or not;
    - each error message, including a hidden attribute reported as unknown;
    - a lowercase `or` is a word to search for;
    - ids come back in dataset order.
  - `conversationFilterFor` returns the same filter for the same index.
- **`shared-state.test.ts`:**
  - `setQueryDraft` stores the text, and clears it when it equals `query ?? ""`;
  - `discardQueryDraft` clears it;
  - `setQueryAndCorrect` sets the query, clears the draft and corrects the conversation;
  - `queryDraft` never appears in a snapshot;
  - the fixture, now with `query`, round-trips.
- **`use-conversation-filter.test.tsx`:**
  - the order of preference for the ids;
  - the status in each case;
  - commit does nothing without a draft or with an unreadable one;
  - commit stores a readable draft and corrects the conversation;
  - discard.
- **`filter-bar.test.tsx`:**
  - the label is tied to the input;
  - each form of the count, and the error;
  - `aria-invalid`;
  - Enter and blur commit; Escape discards;
  - the help opens and closes with ⓘ, ×, Escape and an outside mousedown, and focus returns to ⓘ;
  - the help lists the fields, with attribute labels and ranges.
- **`trace-a-case.test.tsx`:**
  - typing narrows the count and the card's total;
  - prev/next stay within the matches;
  - with no matches, the message shows and the steps and network are gone;
  - clearing the query brings the same conversation back;
  - the load correction uses the stored query, not the draft;
  - an unreadable stored query shows its error and all 800;
  - a draft survives the view unmounting and mounting again.

### Playwright (`playwright/trace-a-case.test.ts`)

- Type `model_correct:0`, see `64 of 800`, and step through the matches.
- Leave an unreadable draft, switch to another view and back, and find the draft and its error
  still there.

## Docs

- **`docs/view-state.md`:**
  - mark `query` "In place";
  - describe `queryDraft` and why it is volatile;
  - add to "Deliberately not kept": a draft query is kept only for the life of the page.
- **`docs/undo.md`:**
  - option 1 is built, as the "filter run first" variant, with synchronous filtering;
  - item 4 is settled: a typed query is stored on Enter or blur;
  - new: the draft is outside undo, so the undo story decides what undoing a query does to a
    pending draft (clearing it is probably right).
- **`src/core/README.md`:** a `filter/` entry.
- **`src/views/trace-a-case/README.md`:** the filter in "What's here", and removed from "Still to
  come".

## Out of scope

- The Filter Options popover (NPW-42).
- URL params, including `shared.query` (NPW-45).
- Commissioned attributes becoming filterable (NPW-41).
- The filter in the other views.
- Moving the lab explorer onto the core filter.
- Undo itself.
