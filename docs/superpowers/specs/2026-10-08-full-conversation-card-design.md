# Conversation Panel: Full Card — Design

## Overview

This replaces Trace a Case's minimal conversation card with the full card. Under the words it adds
an "Actual Label" chip, the observer's notes and a row of attribute indicators. The header gains a
screen-reader status for stepping through conversations, and the card gains an empty state for a
filter that matches nothing.

Jira: [NPW-36](https://concord-consortium.atlassian.net/browse/NPW-36). It builds on NPW-32, which
made the minimal card. It blocks NPW-37 (word contributions colored by pathway), NPW-23 (the
complete Trace a Case) and NPW-25 (Investigate Pathways).

The source is the prototype's `buildNetScreen` in `index.html` on the `neural-net-maker` branch of
the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/), Trace
a Case). Line numbers below refer to that file: the card's DOM at 11036–11098, `render` at
12252–12320, `paintMarks` at 12331–12371, the indicators' CSS at 1851–1924, and the icon
artwork `ALIEN_A1` at 4646–4758.

The branch started on `main` before the filter (NPW-35, PR #38) merged, and was rebased onto it.
The two meet in one place, the empty state; see [Merging with the filter](#merging-with-the-filter).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| How the card is extended | A shell plus parts. `ConversationCard` owns the panel, header, status and empty state, and renders its children as the body. The body is built from exported parts: `ConversationWords`, `ActualLabel`, `ObservationNotes`. | The prototype has three copies of this card. NPW-37's card keeps the header but replaces the body with one tinted reading per pathway (`buildCasePanel`, line 6070), so the body is what varies. Parts compose without the shell growing a flag per story. |
| Which attributes get an indicator | Only those not marked `hidden` in the data: the five visible ones. | Matches the filter (NPW-35), which keeps the four hidden attributes out until they are commissioned. The prototype shows all nine. NPW-41's scope now includes adding indicators for commissioned attributes. |
| The icon artwork | All nine of the prototype's `ALIEN_A1` drawings go into `src/core/`, though only five are drawn for now. | One set of artwork. NPW-41 and Investigate Unknown Pathway need the other four. |
| Attribute colors (`ATTR_COLOUR`) | Not added. Left to the first story that draws them, with their soft and faint tints. | The Trace a Case card draws its icons in plain ink (`--nnm-ink-2`). The colors' first users are Investigate Unknown Pathway's pills and the Correlations headings. |
| Where the empty state lives | In the card: `total === 0` shows the message in place of the header and body. | The ticket lists it as common to every card, so every view gets it without writing its own. |
| Empty-state wording | "No conversations match that search." | As in the ticket and the prototype. |
| The panels' height | The card and the network are the same height, filling the window below the toolbars, from 380 px up to 800 px. The notes box scrolls when the card is too short. Their heads are the same height. | As in the prototype, so the two panels read as one row. See [Panel heights](#panel-heights). |

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

The shell doesn't take the conversation. Only the body parts read it, so a view writes
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
  /** The attributes to show indicators for, in the order to show them. */
  attributes: AttributeDefinition[];
  /** The conversation's values, keyed by attribute key. */
  values?: Record<string, number | null>;
}
```

- **The heading:** an `h3` "Observation notes", under the card's `h2`, so heading navigation can
  reach it. The prototype uses a styled `div`.
- **The box:** the prose, or "(no notes for this conversation)" when there is none.
- **The attribute indicators,** inside the box under the prose: a `<ul>` with one `<li>` per
  attribute, in the order given. Each has, top to bottom:
  - **the label,** `attribute.label`, in Barlow Condensed 400, 12 px, `$ink-3`. The app's font
    link loads only weight 600 today, so it gains 400.
  - **the icon,** `AlienIcon` at 34 px, stroked in `$ink-2`;
  - **the badge,** 18 px square, Lato 700 12 px, `$ink`:
    - an integer attribute shows its number;
    - a binary attribute shows ✔ (U+2714 followed by U+FE0E, so no platform draws it as an emoji)
      for 1, and nothing for 0;
    - a missing or `null` value shows "–", so a blank always means 0. The data never has one, but
      the card shouldn't say "no" when it doesn't know.
- **For screen readers,** each item reads as its label, a colon and the value: "Voices raised:
  yes", "Group size: 2". The value is the attribute's `valueLabels` entry, falling back to the raw
  number, or "not recorded" when missing or `null`. The colon and value are visually hidden; the
  icon and badge are `aria-hidden`. A list, rather than the prototype's `role="img"` on each cell,
  because the role can't sit on an `li`, and the list says how many there are.
- **Layout:** the indicators share the row's width equally, so a label like "Engaged in a task"
  wraps to two lines instead of pushing the row wider. Labels align to the top of their indicator
  and icons and badges to the bottom (the prototype's `margin-bottom: auto` on the label), so every
  icon shares a baseline whichever labels wrapped. 12 px above the row.

The view decides which attributes get indicators. Trace a Case passes the visible ones; see below.

## The icons: `src/core/alien-icons.tsx`

```tsx
export function AlienIcon({ attributeKey, size }: { attributeKey: string; size: number }): JSX.Element | null;
```

- The prototype's nine `ALIEN_A1` drawings, one per attribute key: `voices_raised`,
  `engaged_in_task`, `group_size`, `near_water`, `food_present`, `resource_stressed`,
  `gestures_repeated`, `young_present`, `carrying_burden`.
- Written as JSX elements rather than HTML strings, so nothing needs `dangerouslySetInnerHTML`.
- An `svg` with a 32 × 32 viewBox, `fill="none"`, `stroke="currentColor"`, a 1.7 stroke, round caps
  and joins, `aria-hidden="true"` and `focusable="false"`. The color comes from the parent.
- A key with no drawing returns `null`, names on `Object.prototype` such as `toString` included:
  the drawings are kept in a `Map`. Its indicator then shows the label and badge without an icon.

## Trace a Case

`src/views/trace-a-case/trace-a-case.tsx` composes the card:

```tsx
<ConversationCard position={listPosition} total={ids.length} onPrev={…} onNext={…}>
  {shown &&
    <>
      <ConversationWords text={shown.text} />
      <ActualLabel target={shown.target} labels={alien3Dataset.classificationLabels} />
      <ObservationNotes observation={shown.observation} attributes={indicatorAttributes}
        values={shown.attributes} />
    </>}
</ConversationCard>
```

- **`indicatorAttributes`:** `index.metadata.attributes` without the `hidden` ones, memoized on the
  index. These are the generated attributes in the data's order, so the derived `target`,
  `prediction` and `model_correct` aren't among them. For alien3 that is `voices_raised`,
  `engaged_in_task`, `group_size`, `near_water` and `food_present`.
- **A filter that matches nothing** gives the card a `total` of 0, so it shows its empty state;
  see [Merging with the filter](#merging-with-the-filter). An empty index still shows the existing
  "No conversations."
- **Re-renders:** the card stays outside the step player's observers, so a step playing doesn't
  re-render it.

### Panel heights

CSS only, with no measuring in code and no offset for what sits above the panels:

- **The view** is at least the window's height (`100vh`, which in the Activity Player is the
  iframe's). Its grid takes the height the title leaves (`flex: 1 1 0`, with `min-height: 0`
  because the browser measures its content with the panel row at its largest).
- **The panel row** runs from the network panel's smallest height, 380 px, up to 800 px, and both
  panels stretch to it.
  - 800 px keeps the network from floating in the middle of a very tall window, with room for
    controls added later.
  - 380 px is the network panel's smallest: the diagram's smallest layout (`MIN_HEIGHT` in
    `layout.ts`, 300 px) plus the 62 px head, the diagram's padding and the panel's border. The
    view sets `MIN_HEIGHT` on the layout as `--diagram-min-height`, and the stylesheet adds the
    rest, so the 300 px is written down once. Below it the panels run past the window and the
    page scrolls; on such a short wide window the view's bottom padding doesn't show below them.
- **The network head** has a 62 px minimum, the card's head with its 44 px buttons, so the heads
  match and either can still grow if its controls wrap.
- **The diagram** is `flex: 1 1 440px` with `--diagram-min-height` as its minimum, so it fills the
  panel and the layout centers the drawing.
- **The card** is `height: 100%`, so it fills a cell with a set height and is its natural height
  elsewhere. The body and the notes flex to fill it; the notes box scrolls, with the prototype's
  70 px minimum. On a tall window the box grows, so its background reaches the bottom of the card.
- **The notes box** is a region named by its heading, with `tabIndex={0}`, so a keyboard can
  scroll it: Safari doesn't make a scrolling box focusable on its own.
- **Stacked** (narrower than 857 px), the rows and the layout are their content's height, and
  nothing fills or scrolls.

Playwright checks the heads, the matching and filling at 1280×800, the cap at 1280×1400, the notes
scrolling at 1280×620, the floor, the drawing fitting the panel and the page scroll at 1280×450,
and, stacked, the card's natural height and the view's padding below the panels.

## Merging with the filter

The filter (NPW-35, PR #38) merged first. It rendered its own "No conversations match the filter."
panel in place of the card, as `trace-a-case__no-match`, and left out the steps and the network.
After rebasing on it, this branch:

- deletes that paragraph and its `.trace-a-case__no-match` style;
- always renders the card, with `total` 0 when nothing matches and its parts only when a
  conversation is shown, still leaving out the steps and the network. The card's status stays in
  the page, so loosening the query is announced;
- updates the filter's test to the card's wording. The filter's spec stays as the record of its
  design.

After the merge a change of query updates two polite live regions: the filter bar's count ("64 of
800") and the card's status ("Conversation 1 of 64"). The second tells a listener which
conversation is now shown, so both stay. Check the pair with a screen reader at merge time.

## Testing

### Unit tests (Jest and Testing Library)

- **`ConversationCard`:**
  - the visual count is `aria-hidden`, and the status reads "Conversation 2 of 3";
  - the status is the same element after the conversation changes, and focus stays on Next;
  - the existing tests for the disabled ends and the clicks still pass;
  - with `total` 0 it shows the message and no header, buttons or children, and the status is in
    the document and empty.
- **`ConversationWords`:** one span per word; extra spaces and line breaks are dropped; the
  paragraph's text is the words joined by single spaces.
- **`ActualLabel`:** approach and wait each show their text and their own modifier class; a value
  with no label shows its number; `null` renders nothing.
- **`ObservationNotes`:**
  - the prose, or the fallback when the notes are missing or empty;
  - the notes are a region named "Observation notes" that the keyboard can reach;
  - the items follow the order of `attributes`, not of `values`;
  - badges: ✔ for 1, empty for 0, the number for an integer (0 included), "–" when missing or
    `null`;
  - each item's accessible text: "Voices raised: yes", "Near water: no", "Group size: 4", the raw
    number for an attribute without `valueLabels`, and "…: not recorded" for a missing or `null`
    value.
- **`AlienIcon`:** each of the nine keys renders an `svg`, no two the same; an unknown key, or a
  name on `Object.prototype`, renders nothing.
- **Trace a Case:** the current conversation's label, notes and attribute indicators show, with
  none for a hidden attribute; next updates the status. When nothing matches, the card shows its
  empty state and its status stays the same element. The tests that found the words by their full
  text, including the filter's, check the card's text content instead, since the words are now
  separate spans.

### Playwright (`playwright/trace-a-case.test.ts`)

Two new tests against the real alien3 data, written so each check can fail, besides the panel
tests under [Panel heights](#panel-heights):

- the card:
  - conversation 1 shows a "wait" chip, notes starting "At least one juvenile was present.", and
    five attribute indicators: "Voices raised: no", "Engaged in a task: yes", "Group size: 2",
    "Near water: yes", "Food present: no";
  - each indicator has an icon, and the five share the row equally;
  - no indicator is named for a hidden attribute, such as "Resource stressed";
  - after Next, the status reads "Conversation 2 of 800" and the chip says "approach";
- in the stacked layout, the card doesn't scroll sideways.

## Docs

- `src/core/README.md`: the `conversation-card/` entry describes the shell and its parts instead of
  "the minimal conversation card"; new entries for `alien-icons.tsx` and `visually-hidden.scss`.
- `src/views/trace-a-case/README.md`: drop "the label chip, observation notes and attribute icons"
  and "the filter" from the list of what is still to come, and say the card shows an attribute
  indicator for each attribute that isn't hidden.

## Out of scope

- Animate and speed, About, neuron hover, Step 1's word flights and the activation legend.
- `ATTR_COLOUR` and its tints: the first story that draws attribute colors.
- Attribute indicators for commissioned attributes (NPW-41).
- Word contributions colored by pathway (NPW-37).
- The card in Investigate Pathways and the other views: their own stories.
