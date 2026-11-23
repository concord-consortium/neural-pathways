# Neural Pathway View of Model Reasoning: word contributions in the message card — Design

## Overview

This builds the left side of Neural Pathway View of Model Reasoning: the filter, and under it a
message card that shows the message three times, once per pathway. In each of these pathway
readings, a word is colored by how much it pushes that pathway up (orange) or down (blue), and a
Word Contribution legend gives the scale. A student can see which words drive each pathway for a
given message, and get a word's exact score with the mouse, the keyboard or a screen reader.

The single pathway reading is built to be reused: Identify Contextual Factors (NPW-27) shows one
for its focus pathway, and the flow on the right of this view (NPW-39) lines up with the three.

Jira: [NPW-37](https://concord-consortium.atlassian.net/browse/NPW-37). It builds on NPW-35
(filter) and NPW-36 (message card), and on the v1.4 design (NPW-74). The branch is
`NPW-37-word-contributions`, from NPW-75's branch (`NPW-75-interactive-title-and-sizes`), which
leaves the view titles out of the Interactives. NPW-23 (Looking Inside a Neural Network) is being
built beside it on `NPW-23-looking-inside`.

The source is prototype v1.4: `index.html` at commit `7acc4db` on the `neural-net-maker` branch of
the demos repo ([live](https://models-resources.concord.org/demos/branch/neural-net-maker/),
Neural Pathway View of Model Reasoning). The card is `buildCasePanel` (6323–6445) and its words are
colored by `paintReading` (6416–6436). The ramp is at 6176–6231 and the styles at 1599–1616 and
1750–1847. Line numbers below are in that file.

How a word's score is shown was settled with a mockup,
[Word Contribution Scores](https://claude.ai/artifact/PPjywjsLDpEh3z97abR8d9): Michael and Jie
chose its version A, v1.4's tooltip, which now also follows the keyboard focus.

## Goals

- The view shows the filter above a message card the same width as Looking Inside's (447 px), with
  the count ("3 / 57") on its title row and the message set in Spline Sans Mono.
- The card shows three pathway readings, Pathway 1 to 3, each coloring the words that push its
  pathway up or down on the stepped ramp.
- A Word Contribution legend shows the continuous ramp from −max to +max, where max is the largest
  word score in the whole dataset, so a word keeps its color from message to message.
- A word's exact score can be reached by mouse, by keyboard and by screen reader.
- The color ramp is in `src/core/`, for Prediction Chain (NPW-39) and Correlations (NPW-40).
- One pathway reading component, which NPW-27 can use on its own.

## Non-goals

- Hiding the colors until Activate, and the words flying into the activation cells (NPW-26).
- Lining the readings up with the flow's rows (NPW-39). This story keeps v1.4's spacing between
  readings; NPW-39 may change it.
- Anything on the right of the view: the flow, the steps, Animate and speed.
- Switching Looking Inside a Neural Network to the shared card width. NPW-23 is changing its
  stylesheet; that's a small follow-up once NPW-23 merges.
- Renaming "Word Contribution". Jie asked for "Token score" or "Token influence"; v1.4 kept "Word
  Contribution", and so do we.
- The Yelp data in the lab. The new index field is optional and the lab doesn't read it.

## Anti-goals

- A scale that moves from message to message. If the legend's ends changed as the student stepped
  through messages, the same word would change color, and comparing messages, which is the point of
  the view, would mislead.
- A score only the mouse can reach. v1.4's `title` tooltip is exactly that.
- Dozens of Tab stops. A message has 12–40 words; making each word its own stop would put up to 40
  stops between the filter and the flow's controls.
- Two copies of the coloring code. The prototype has `paintReading` and `paintFocus` (6895); we
  build one.

## Constraints

- `docs/accessibility.md`: text is drawn at full size, never scaled to fit; the view's minimum
  layout size fits inside 1024 × 562; down to 320 px wide everything still works; a scroller works
  from the keyboard.
- Michael owns the visual design. Where accessibility conflicts with it, keep his design and log the
  conflict for him to decide. The view's accessibility story is NPW-76, as NPW-49 is for the network
  diagram.
- `src/core/` holds what more than one view uses. The ramp, the pathway reading, the legend and the
  word-score loading are all used again by later views, so they go there.
- Don't edit `src/views/looking-inside/looking-inside.scss` on this branch; NPW-23 is changing it.
  `src/core/README.md` will conflict a little with NPW-23, which adds an entry too.

## The data

The alien3 data already has what this needs, in `shap/alien-fa-3/{bucket}.json`, loaded by
`fetchShap` (`src/core/data-loader.ts`). For each message, `words` lists every word with one score
per pathway, between `[CLS]` at the start and a `[SEP]` after each turn, which both score zero.

In the generated data, each of the 30 words scores on exactly one pathway and is zero on the other
two, and a word has the same scores in every message (`groupBuilder` in
`generator/alien/config-common.ts`, `shapForConversation` in `generator/alien/emit.ts`). So in each
reading only about a third of the words are colored. Nothing here relies on that: a word that
scores on two pathways is colored in both readings.

The prototype's scale maximum is the largest |score| in its whole vocabulary (`tokMax`, 6243). For
the current data that is 0.2598 (`oradda` and `essulo`).

## Approaches

### Where the scale maximum comes from (chosen: A)

| | Approach | Trade-off |
|---|---|---|
| **A** | **The generator writes it into `index.json`, beside the fit's other ranges.** | **Matches the prototype: a fixed legend, and a word keeps its color everywhere. Costs a generator change and a new optional field.** |
| B | The largest score in the current message, across its three readings. | No data change, but the legend's ends move with every message and a word's color changes between messages. |
| C | Load every SHAP bucket and take the largest. | Up to 256 downloads for one number. |

Scott chose A.

### Keyboard access to the scores (chosen: B)

| | Approach | Trade-off |
|---|---|---|
| A | Each colored word is a Tab stop. | Simple. 12–40 stops between the filter and whatever follows. |
| **B** | **Each reading is one Tab stop, a single-choice listbox; the arrow keys move from word to word, and a click does the same as arrowing to a word.** | **Three stops. More to build: a roving tabindex and key handling. The standard pattern, which screen readers support well, and NPW-23 uses the same idea for the neurons.** |
| C | No stops. The score is hidden text after each word for screen readers, and the mouse gets a tooltip. | Cheapest, but a sighted keyboard user gets only the color. |

Scott chose B.

### Showing the score (chosen: A)

| | Approach | Trade-off |
|---|---|---|
| **A** | **v1.4's tooltip over the word, shown on hover and now also on keyboard focus.** | **Keeps v1.4's look. Covers the line above the word; must meet WCAG 1.4.13 (dismissible, hoverable, persistent).** |
| B | The current word's score on each reading's Pathway row, so all three show at once. Hover previews another word. | No floating layer and no extra height. But the readings scroll for most messages, so often only one or two rows are in view; and a change from v1.4. |

Both were mocked up for Michael and Jie, who chose A.

## Design

### The view

`ModelReasoning` replaces its `ViewPlaceholder` with the view's title and a 447 px left column
holding the filter row and, under it, the message card. As in v1.4, About sits beside the filter, at
the right end of the filter row (`nnm-filterrow`, 5994–5999), not over a second column as in
Looking Inside. The right side stays empty until NPW-39. It loads the index with
`useDatasetIndex(alien3Dataset, { onLoaded })` and corrects the shared message and query as Looking
Inside does, through `SharedState`, so the message and the query are the same in every view.

The card is the shared `MessageCard` (title, count, previous and next). Its body is the legend and
then a scroller holding the three readings. Unlike Looking Inside, this card has no actual label and
no observation notes (v1.4's 2B has neither).

**The card width.** The 447 px is defined once, in a new `src/core/message-card/layout.scss` as
`$width: 447px`, which this view's stylesheet uses. Looking Inside switches to it after NPW-23
merges. (The `.scss` partial holds only the variable, so `@use` adds no CSS.)

**Narrower than the card.** Below its minimum layout width the card takes the full width between
the gutters, and the words wrap.

**The card's height.** The card fills the column's height, up to 800 px as Looking Inside's does
(our call), and the readings scroll inside it (`.nnm-readscroll`, 1768), so the legend stays in
view. With the view's title shown, the designed size leaves about 255 px for the readings: three
readings of a 12-word message need about 280 px, and of a 40-word message about 560 px. NPW-75
leaves the view titles out of the Interactives, which gives the card about 80 px more: about 340 px
for the readings, so a short message's readings fit and a long one's scroll.

**The scroller and the keyboard (our call).** The scroller doesn't use `useKeyboardScrollable`,
which would make it a fourth Tab stop whenever it overflows. Everything in it but the Pathway rows
is in the three listboxes, which Tab and the arrow keys already reach, and a focused word scrolls
into view, as the hook's comment says of a scroller that holds only controls. Note this exception
where `docs/accessibility.md` lists scrollers.

### The legend

A small core component, `WordContributionLegend`, takes the maximum. It draws v1.4's caption and
bar (`.nnm-readhead` and `.nnm-legend`, 1757–1832):

- the caption "Word Contribution", Barlow Condensed 14 px, uppercase, `$ink-3`;
- under it the minimum, the bar and the maximum, 12 px monospaced: "−0.2598", a 12 px tall
  continuous gradient through `RAMP_STOPS` with a hairline inside edge, "+0.2598". The minus is
  U+2212 and the values have four decimals.

It is `role="img"` named "Word contribution, from minus 0.2598 to plus 0.2598". The prototype's name
adds "shared by all three pathways"; we drop it, since NPW-27 shows the legend over one reading.

It is not NPW-23's activation legend (`src/core/activation-legend/`, not on this branch), which
captions two neuron swatches. Their captions may be worth sharing once both are merged.

### The color ramp

In `src/core/colors.ts`, beside `POSITIVE_COLOR` and `NEGATIVE_COLOR`:

- `FILL_POS = ["#EFD3C4", "#E0B6A4", "#D29A84", "#C6836C", "#A84A2C"]` and
  `FILL_NEG = ["#C8D6E9", "#A9BDD8", "#8DA6CA", "#7694BD", "#1F4E8F"]`, palest first (6176–6177).
  `POSITIVE_COLOR` and `NEGATIVE_COLOR` become their last steps.
- `rampLevel(t)` for `t` in 0–1: 0 below 0.12, 1 below 0.30, 2 below 0.50, 3 below 0.75, else 4
  (`level` and `CUTS`, 6178 and 6228).
- `wordFill(value, max)`: `{ background, text }` for a word scored `value` on a scale of ±`max`:
  `(value >= 0 ? FILL_POS : FILL_NEG)[rampLevel(min(1, |value| / max))]`, with white text on step 4
  and `$ink` otherwise (6426–6429). A word scoring exactly 0 isn't colored at all; `wordFill` is
  only called for nonzero scores.
- `RAMP_STOPS = ["#1F4E8F", "#C8D6E9", "#FFFFFF", "#EFD3C4", "#A84A2C"]`, the legend's gradient
  (`RAMP_CSS`, 6185).

`colors.scss` gets the ramp's stops as a list for the legend's gradient, and `colors.test.ts`
checks them against `colors.ts` as it does `$positive` and `$negative`. Update the comment on
`POSITIVE_COLOR`, which says the full ramps will come later.

The prototype's `rampAt` and its relatives (6186–6226) blend continuously for Correlations; they
are NPW-40's to port.

### The scale maximum

**The generator.** `buildDataset` in `generator/alien/emit.ts` writes `word_score_max` into the
fit's entry in `metadata.fa_fits`, next to `pathway_score_min` and `pathway_score_max`: the largest
|score| over every word of every message in the fit's SHAP buckets. Computing it from the emitted
buckets, rather than from the vocabulary, keeps it right if the SHAP scores ever stop being a
fixed weight per word.

**The type.** `S3FaFit` gets `word_score_max?: number`, documented in
`docs/data/s3-data-format.md`. It is optional because the Yelp data doesn't have it.

**Reading it.** `alien3WordScoreMax(index)` in `src/core/datasets/alien3-dataset.ts` returns it
from the index's single fit, and throws, with the same "regenerate" advice as the loadings reader,
when it is missing or not a positive number. The view catches the error and shows it in an alert,
as Looking Inside does for the network. In the same place the view checks that the fit has the three
pathways it shows (`n_pathways`), and builds the index's filter, so that a mount with the index
already loaded shows the alert for bad filter attributes too, rather than throwing while it
renders.

### Loading the word scores

A core hook, `useWordScores(dataset, fitName, item)` in `src/core/use-word-scores.ts`, loads the
message's scores with `fetchShap`, keeping one bucket cache per dataset so stepping back and forth
doesn't fetch again. NPW-27 and NPW-39 use it too. It returns loading, an error, or the scores. An
error says which part failed, the fetch or lining the scores up, as `useDatasetIndex`'s does.

The scores it returns are one entry per word of `messageWords(text)` (`src/core/message-text.ts`),
so they line up with what the card shows: `alignWordScores` (`src/core/word-scores.ts`) drops
`[CLS]` and `[SEP]`, then checks the remaining words match the message's words one for one, and
throws if they don't.

While a message's scores load, the readings show its words uncolored and not yet in a listbox. If
they fail to load, an alert in the card body says they could not be loaded, and if they don't match
the message, that they could not be shown; the filter and the navigation still work.

### The pathway reading

`PathwayReading` in `src/core/message-card/` shows one reading: its Pathway row and the message's
words, each in a span, colored by `wordFill` from that pathway's scores, with the tooltip. It is
controlled: the caller passes the current word and is told when it changes, so three readings can
share one current word and NPW-27 can use one on its own.

The three readings and their shared state are in the view's folder (Model Reasoning uses them
alone).

It is built from the styles in v1.4 (1777–1847): the Pathway row, Lato 12.5 px `$ink-2` with a
1 px `#B9CBE4` rule under it; then the words, Spline Sans Mono 13 px, line height 1.85; colored
words with a 3 px radius and 1 px × 2 px padding. The readings are 30 px apart (`--nnm-row-gap`).

Words are split by `messageWords`, as `MessageWords` does. `MessageWords` itself stays as it is for
Looking Inside; its word flights look for `.message-words__word` in that view only.

### The keyboard and screen readers

Each reading's words are a single-choice listbox named by its pathway ("Pathway 1"), with each word
an option. There is one **current word** for all three readings, the same position in each, so
Tab from one reading to the next lands on the same word and its score there can be compared.

| Input | Does |
|---|---|
| Tab into a reading | Focuses the current word, or the first word if there is none, which makes it current. |
| → or ↓ | The next word becomes current and takes the focus. Stops at the last. |
| ← or ↑ | The previous word, the same way. Stops at the first. |
| Home, End | The first or last word. |
| Click a word | It becomes current and takes the focus. |
| Tab out | Leaves the reading; the current word stays. |

Focus follows selection: the focused word is `aria-selected="true"`. Only the current word is in
the tab order (`tabindex="0"`); every other word is `tabindex="-1"`. Before any word is current, the
first word of each reading has `tabindex="0"`.

A word's accessible name says what its tooltip says, for this reading's pathway: "tarrak, plus
0.0624" where the word scores, and "tarrak, a Pathway 1 word" where it is zero, naming the pathway
it does score on (as in the mockup). The listbox's name gives the reading's pathway, and screen
readers add the position ("3 of 25") themselves. A word that is zero on every pathway is just the
word.

The current word has no mark of its own beyond the focus ring: with the tooltip, there is nothing
to show once the focus has left the readings.

Every word is an option, colored or not, so the arrow keys never skip and the position matches the
message.

**Forced colors.** The word backgrounds go away in forced-colors mode, so the focus ring must be an
`outline` (a `box-shadow` is removed), and the tooltip needs a border to stand out from the page.
The tooltip still gives the number, but nothing marks which words are colored; that is a known gap,
logged in NPW-76 for Michael (see Constraints).

### Showing the score

A tooltip over the word, as in v1.4 and the mockup's version A. v1.4 used the browser's `title`;
this is a drawn one, so it can show on keyboard focus and meet 1.4.13.

**What it says.** For this reading's pathway: "tarrak: +0.0624", four decimals with the U+2212
minus, the value monospaced; or, for a word that is zero here, "tarrak: a Pathway 1 word", naming
the pathway it scores on (6430–6432). A word that is zero on every pathway has no tooltip. The
text is in `src/core/message-card/word-score-text.ts`, which the readings' names and the legend
share.

**When it shows.** There is one tooltip per card. It follows whichever moved last, the pointer or the
keyboard focus, over the word the pointer entered or the word the focus moved to. A word that is zero
on every pathway shows none, but still counts as where the pointer or the focus moved. When the
pointer leaves its word, it shows over the focused word. It moves with the word when the readings scroll,
and hides while that word is scrolled out of the scroller's view.

**1.4.13** ([Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)):
- *Dismissible:* Escape hides it without moving the focus. It comes back on the next word the
  pointer or the keyboard moves to.
- *Hoverable:* the pointer can move from the word onto a tooltip the pointer opened without it
  going away. A tooltip the focus opened lets the pointer through to the words it covers.
- *Persistent:* it stays until the pointer leaves both the word and the tooltip, the focus leaves the
  word, the pointer or the focus moves to another word, or Escape.

**Where and how it's drawn.** `WordTooltipArea` (`src/core/message-card/word-tooltip.tsx`) draws
it. It is centered over the word, with a small pointer under it, and kept inside the readings from
side to side, with its pointer still over the word. floating-ui (`computePosition` and
`autoUpdate`) places it, and places it again when the word or the tooltip moves or changes size,
as after a text-only zoom. It is at most as wide as the readings, and wraps when it would be wider,
as at 320 px with the text zoomed. It is `$ink` with white Lato 12.5 px text, as in the mockup. It
lives outside the readings' scroller, so the scroller doesn't clip it. It is `aria-hidden`: the
word's name already says the same thing.

## State

The view keeps nothing new in the state tree. The message and the query are the shared ones, which
already exist. `ModelReasoningState` (`docs/view-state.md`) is NPW-39's to add.

| Value | Owner | Written by | Read by | Changes | Survives | Saved |
|---|---|---|---|---|---|---|
| message, query | `SharedState` (exists) | filter, card navigation | the view | per step, per query | everything | yes |
| scale maximum | the index | the generator | legend, readings | never | everything | n/a |
| word scores | `useWordScores` cache | fetch | readings | per message | the page | no |
| current word | `ModelReasoningReadings` | click, keys, focus | tabindex, `aria-selected` | per click or key | nothing: cleared on message change | no |
| hovered word | `WordTooltipArea`'s reducer | pointer | tooltip | per pointer move | nothing | no |
| tooltip dismissed | `WordTooltipArea`'s reducer | Escape, next word | tooltip | per Escape | nothing | no |

Add the current word to `docs/view-state.md`'s "Deliberately not kept". Hover is already listed.

## The view's states

| Index | Matches | Word scores | Card body |
|---|---|---|---|
| loading | — | — | no card; "Loading messages…" |
| error; no scale maximum, not three pathways, or bad filter attributes | — | — | no card; an alert |
| ready | none | — | the card's "No messages match that search." |
| ready | some | loading | legend; three readings, uncolored, not yet listboxes |
| ready | some | error | legend; an alert in the body |
| ready | some | ready | legend; three colored readings; current word none until chosen |

## Glossary

Add to `docs/glossary.md`, under Messages:

- **pathway reading:** the message shown for one pathway, its words colored by their scores for
  that pathway. Not to be confused with a reading in Extract the Neural Pathways, which is a value.
- **word score:** how much a word pushes a pathway up or down, from the SHAP data. The legend calls
  it Word Contribution, which is the name students see.
- **scale maximum:** the largest |word score| in a fit's SHAP buckets (`word_score_max`), the
  legend's ends.
- **current word:** the word last focused or clicked in a reading, the same position in all three
  readings, which holds each reading's Tab stop. Not "selected" in prose, though it is
  `aria-selected` in the markup.

## Testing

Jest:

- `rampLevel` at and around each cut; `wordFill` for both signs, each step, values past the
  maximum, and white text only on step 4.
- `colors.scss` and `colors.ts` hold the same ramp.
- The generator writes `word_score_max` equal to the largest |score| in its buckets; the round trip
  test reads it back.
- `alien3WordScoreMax` returns the value, and throws when it is missing, zero or negative.
- `useWordScores`: drops `[CLS]` and `[SEP]`, lines up with `messageWords`, errors on a mismatch,
  caches buckets, and errors on a failed fetch.
- The legend: its text, the U+2212 minus, and its name.
- `PathwayReading`: colors only nonzero words, a listbox named by its pathway, each option's name
  for a scoring word, a zero word and a word that is zero everywhere, the roving tabindex, each key
  in the table, clicks.
- The tooltip's text for each of those words, with the U+2212 minus; it shows on hover and on
  focus, follows whichever of the pointer and the focus moved last, and Escape hides it until the
  next word.
- The view: the filter and About above the card, the count, three readings, the shared current
  word, cleared on message change, and the error and loading states.

Playwright:

- The tooltip appears on hover and on keyboard focus, stays while the pointer moves onto it, hides
  on Escape, follows its word when the readings scroll, and isn't clipped by the scroller or the
  card's sides.
- Tab order: filter, About, card navigation, then one stop per reading, with no stop on the
  readings' scroller even when it overflows; Tab into the next reading lands on the same word.
- At the minimum layout size nothing scrolls but the readings, and the page doesn't scroll down; at
  320 px the card takes the full width and nothing scrolls sideways; with only the text zoomed to
  200%, the words and the tooltip are twice the size, the tooltip follows its word and stays inside
  the card, and at 320 px every tooltip wraps to stay inside the readings.
- Forced colors: the focus ring and the tooltip can still be seen.

## Docs to update

- `src/views/model-reasoning/README.md` (new): what's here, the minimum layout size, and what's
  still to come (the flow and the steps).
- `src/core/README.md`: the ramp, the legend, `PathwayReading`, `useWordScores`, the card width.
- `docs/view-state.md`, `docs/glossary.md` as above.
- `docs/accessibility.md`: the readings' scroller, which is a Tab stop only while the scores load.
- `docs/data/s3-data-format.md`: `word_score_max`.

## Left to the builder

Each was settled while building:

- The exact component split between the view, the three readings and `PathwayReading`, as long as
  `PathwayReading` is controlled and works alone. *Settled:* the view, `ModelReasoningReadings`
  (the three readings, their scroller and the current word) and `PathwayReading`.
- The view's minimum layout size, measured and recorded in its README. Until NPW-39 it is the left
  column only; it must fit 1024 × 562, with no title in an Interactive (NPW-75). *Settled:*
  479 × 362 px.
- How `useWordScores` shares its cache between views (module-level per dataset, or a context), as
  long as a dataset change gets a fresh one. *Settled:* module-level, by dataset id.
- Whether the readings render before their scores arrive or wait, if showing uncolored words first
  looks wrong in the browser. *Settled:* they show the words uncolored while the scores load.
