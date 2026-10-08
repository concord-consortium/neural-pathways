# Conversation Panel: Full Card — Design

## Overview

This replaces Trace a Case's minimal conversation card with the full card. Under the words it adds
an "Actual Label" chip, the observer's notes and a row of attribute marks. The header gains a
screen-reader status for stepping through conversations, and the card gains an empty state for a
filter that matches nothing.

Jira: [NPW-36](https://concord-consortium.atlassian.net/browse/NPW-36). It builds on NPW-32, which
made the minimal card. It blocks NPW-37 (word contributions colored by pathway), NPW-23 (the
complete Trace a Case) and NPW-25 (Investigate Pathways).

The source is the prototype's `buildNetScreen` in `index.html` on the `neural-net-maker` branch of
the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/), Trace
a Case). Line numbers below refer to that file: the card's DOM at 11036–11098, `render` at
12252–12320, `paintMarks` at 12331–12371, the marks' CSS at 1851–1924, and the icon artwork
`ALIEN_A1` at 4646–4758.

The branch is based on `main`, not on the filter (NPW-35, PR #38). The two meet in one place, the
empty state; see [Merging with the filter](#merging-with-the-filter).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| How the card is extended | A shell plus parts. `ConversationCard` owns the panel, header, status and empty state, and renders its children as the body. The body is built from exported parts: `ConversationWords`, `ActualLabel`, `ObservationNotes`. | The prototype has three copies of this card. NPW-37's card keeps the header but replaces the body with one tinted reading per pathway (`buildCasePanel`, line 6070), so the body is what varies. Parts compose without the shell growing a flag per story. |
| Which attributes get a mark | Only those not marked `hidden` in the data: the five visible ones. | Matches the filter (NPW-35), which keeps the four hidden attributes out until they are commissioned. The prototype shows all nine. NPW-41's scope now includes adding marks for commissioned attributes. |
| The icon artwork | All nine of the prototype's `ALIEN_A1` marks go into `src/core/`, though only five are drawn for now. | One set of artwork. NPW-41 and Investigate Unknown Pathway need the other four. |
| Attribute colors (`ATTR_COLOUR`) | Not added. Left to the first story that draws them, with their soft and faint tints. | The Trace a Case card draws its marks in plain ink (`--nnm-ink-2`). The colors' first users are Investigate Unknown Pathway's pills and the Correlations headings. |
| Where the empty state lives | In the card: `total === 0` shows the message in place of the header and body. | The ticket lists it as common to every card, so every view gets it without writing its own. |
| Empty-state wording | "No conversations match that search." | As in the ticket and the prototype. |
| The card's height | Its natural height. | In the prototype the card stretches to the network panel's height and the notes scroll. The notes are a few sentences, so a scroll box would mostly add a second scrollbar. |

## The shell: `ConversationCard`

`src/core/conversation-card/conversation-card.tsx`. It is presentational and doesn't import the
store.

```tsx
interface ConversationCardProps {
  /** The conversation's 0-based position in the list being stepped through. */
  position: number;
  /** How many conversations the list has. 0 shows the empty state. */
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** The body: some of the parts below. Not rendered when total is 0. */
  children?: React.ReactNode;
}
```

The shell no longer takes the conversation. Only the body parts read it, so a view writes
`{item && <>…parts…</>}` as the card's children.

- **The panel:** `<section aria-label="Conversation">` with the existing panel look.
- **The header,** unchanged from the minimal card:
  - an `h2` "Conversation";
  - the count "3 / 800" (1-based), now `aria-hidden`;
  - ◀ ▶ buttons labeled "Previous conversation" and "Next conversation". At the ends they get
    `aria-disabled` and do nothing, so they stay in the tab order. The list doesn't wrap.
- **The status:** a visually hidden `<span role="status">` that reads "Conversation 3 of 800".
  - It is the count's only accessible text, and its change is what announces prev/next.
  - It stays mounted whether or not the card is empty, because a live region only announces
    reliably while it stays in the DOM. When the card is empty its text is empty.
- **The body:** the children, in a column with the existing 12 px by 14 px padding.
- **The empty state,** when `total` is 0:
  - the header and body are replaced by a paragraph, "No conversations match that search.";
  - the section, its label and the panel look stay;
  - centered, `$ink-3`, 15 px, as in the prototype's `.nnm-empty`.

### Visually hidden text

Core has no visually hidden style; the only one is the app's `.visually-hidden` in
`src/app/components/standalone-layout.scss`, which core may not use. Add a `visually-hidden` mixin
in `src/core/visually-hidden.scss`, and have the app's class include it, so the rule is written
once.

## The body parts

Each is presentational and lives in `src/core/conversation-card/`. In Trace a Case they stack in
this order, as in the prototype.

### `ConversationWords({ text })`

- A `<p>` holding one `<span>` per word of `conversationWords(text)`, with a space between each, so
  the paragraph still reads as one run of words. Line breaks and repeated whitespace only separate
  words.
- No per-word hook yet. NPW-37 adds the tint it needs, and Step 1's word flights add theirs. The
  component is the place they extend, but its props don't guess at their needs.
- The current text style: Lato 13 px, line height 1.85, `$ink`.

### `ActualLabel({ target, labels })`

`labels` is the dataset's `classificationLabels`, e.g. `{ 0: "wait", 1: "approach" }`.

- One line: an "Actual Label" caption, then a pill holding `labels[target]`.
  - **Caption:** Barlow Condensed 600, 11 px, uppercase, `$ink-2`.
  - **Pill:** Barlow Condensed 600, 13 px, uppercase by CSS, a 2 px border, fully rounded.
    Approach (1) uses `$approach-text` on `$approach-soft` with an `$approach` border; wait (0)
    uses the `$wait-*` set. These are the pair the network's output pill uses.
- With a `target` of `null` it renders nothing. alien3 always has one.
- A screen reader hears "Actual Label approach".

### `ObservationNotes({ observation, attributes, values })`

```tsx
interface ObservationNotesProps {
  observation?: string;
  /** The attributes to mark, in the order to show them. */
  attributes: AttributeDefinition[];
  /** The conversation's values, keyed by attribute key. */
  values?: Record<string, number>;
}
```

- **The heading:** an `h3` "Observation notes", under the card's `h2`, so heading navigation can
  reach it. The prototype uses a styled `div`.
- **The box:** the prose, or "(no notes for this conversation)" when there is none.
- **The marks,** inside the box under the prose: a `<ul>` with one `<li>` per attribute, in the
  order given. Each item has, top to bottom:
  - **the label,** `attribute.label`, in Barlow Condensed 400, 12 px, `$ink-3`. The app's font
    link loads only weight 600 today, so it gains 400.
  - **the icon,** `AlienMark` at 34 px, stroked in `$ink-2`;
  - **the badge,** 18 px square, Lato 700 12 px, `$ink`:
    - an integer attribute shows its number;
    - a binary attribute shows ✔ (U+2714 followed by U+FE0E, so no platform draws it as an emoji)
      for 1, and nothing for 0. Every note states every attribute, so a blank can't be confused
      with "not recorded";
    - a missing value shows "–". The data never has one, but the card shouldn't say "no" when it
      doesn't know.
- **For screen readers,** each item reads as its label, a colon and the value: "Voices raised:
  yes", "Group size: 2". The value is the attribute's `valueLabels` entry, falling back to the raw
  number, or "not recorded" when missing. The colon and value are visually hidden; the icon and
  badge are `aria-hidden`. A list, rather than the prototype's `role="img"` on each cell, because
  the role can't sit on an `li`, and the list says how many there are.
- **Layout:** the cells share the row's width equally, so a label like "Engaged in a task" wraps to
  two lines instead of pushing the row wider. Labels align to the top of their cell and icons and
  badges to the bottom (the prototype's `margin-bottom: auto` on the label), so every icon shares
  a baseline whichever labels wrapped. 12 px above the row.

The view decides which attributes to mark. Trace a Case passes the visible ones; see below.

## The icons: `src/core/alien-marks.tsx`

```tsx
export function AlienMark({ attributeKey, size }: { attributeKey: string; size: number }): JSX.Element | null;
```

- The prototype's nine `ALIEN_A1` drawings, one per attribute key: `voices_raised`,
  `engaged_in_task`, `group_size`, `near_water`, `food_present`, `resource_stressed`,
  `gestures_repeated`, `young_present`, `carrying_burden`.
- Written as JSX elements rather than HTML strings, so nothing needs `dangerouslySetInnerHTML`.
- An `svg` with a 32 × 32 viewBox, `fill="none"`, `stroke="currentColor"`, a 1.7 stroke, round caps
  and joins, `aria-hidden="true"` and `focusable="false"`. The color comes from the parent.
- A key with no drawing returns `null`. Its mark then shows the label and badge without an icon.

## Trace a Case

`src/views/trace-a-case/trace-a-case.tsx` composes the card:

```tsx
<ConversationCard position={position} total={ids.length} onPrev={…} onNext={…}>
  <ConversationWords text={item.text} />
  <ActualLabel target={item.target} labels={alien3Dataset.classificationLabels} />
  <ObservationNotes observation={item.observation} attributes={markedAttributes} values={item.attributes} />
</ConversationCard>
```

- **`markedAttributes`:** `index.metadata.attributes` without the `hidden` ones, memoized on the
  index. These are the generated attributes in the data's order, so the derived `target`,
  `prediction` and `model_correct` aren't among them. For alien3 that is `voices_raised`,
  `engaged_in_task`, `group_size`, `near_water` and `food_present`.
- **A filter that matches nothing** gives the card a `total` of 0, so it shows its empty state;
  see [Merging with the filter](#merging-with-the-filter). An empty index still shows the existing
  "No conversations."
- **Re-renders:** the card stays outside the step player's observers, so a step playing doesn't
  re-render it.

## Merging with the filter

The filter (NPW-35, PR #38) merged first. It rendered its own "No conversations match the filter."
panel in place of the card, as `trace-a-case__no-match`, and left out the steps and the network.
After rebasing on it, this branch:

- deletes that paragraph and its `.trace-a-case__no-match` style;
- always renders the card, with `total` 0 when nothing matches and its parts only when a
  conversation is shown, still leaving out the steps and the network. The card's status stays in
  the page, so loosening the query is announced;
- updates the filter's test and spec to the card's wording.

After the merge a change of query updates two polite live regions: the filter bar's count ("64 of
800") and the card's status ("Conversation 1 of 64"). The second tells a listener which
conversation is now shown, so both stay. Check the pair with a screen reader at merge time.

## Testing

### Unit tests (Jest and Testing Library)

- **`ConversationCard`:**
  - the visual count is `aria-hidden`, and the status reads "Conversation 2 of 3";
  - the existing tests for the disabled ends and the clicks still pass;
  - with `total` 0 it shows the message and no header, buttons or children, and the status is in
    the document and empty.
- **`ConversationWords`:** one span per word; extra spaces and line breaks are dropped; the
  paragraph's text is the words joined by single spaces.
- **`ActualLabel`:** approach and wait each show their text and their own modifier class; `null`
  renders nothing.
- **`ObservationNotes`:**
  - the prose, or the fallback when there is none;
  - the items follow the order of `attributes`, not of `values`;
  - badges: ✔ for 1, empty for 0, the number for an integer, "–" when missing;
  - each item's accessible text: "Voices raised: yes", "Near water: no", "Group size: 4", the raw
    number for an attribute without `valueLabels`, and "…: not recorded" for a missing value.
- **`AlienMark`:** each of the nine keys renders an `svg`; an unknown key renders nothing.
- **Trace a Case:** the current conversation's label, notes and marks show, with no mark for a
  hidden attribute; next updates the status. The existing test that finds the words by their full
  text changes to check the paragraph's text content, since the words are now separate spans.

### Playwright (`playwright/trace-a-case.test.ts`)

One new test against the real alien3 data, written so each check can fail:

- conversation 1 shows a "wait" chip, notes starting "At least one juvenile was present.", and
  five marks: "Voices raised: no", "Engaged in a task: yes", "Group size: 2", "Near water: yes",
  "Food present: no";
- no mark is named for a hidden attribute, such as "Resource stressed";
- after Next, the status reads "Conversation 2 of 800" and the chip says "approach".

## Docs

- `src/core/README.md`: the `conversation-card/` entry describes the shell and its parts instead of
  "the minimal conversation card"; new entries for `alien-marks.tsx` and `visually-hidden.scss`.
- `src/views/trace-a-case/README.md`: drop "the label chip, observation notes and attribute icons"
  from the list of what is still to come.

## Out of scope

- Animate and speed, About, neuron hover, Step 1's word flights and the activation legend.
- `ATTR_COLOUR` and its tints: the first story that draws attribute colors.
- Marks for commissioned attributes (NPW-41).
- Word contributions colored by pathway (NPW-37).
- The card in Investigate Pathways and the other views: their own stories.
