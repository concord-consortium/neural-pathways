# Neural Pathway View of Model Reasoning

The lesson's view of how the model reasons from a message: each pathway's reading of its words.

## What's here

- `model-reasoning.tsx`: the view. It loads the alien3 messages, keeps the shared message valid,
  and lays out the filter row, with About at its right end, over the message card. Prev/next step
  through the messages the filter matches. The card's body is the Word Contribution legend over the
  three pathway readings. While a message's word scores load, its readings show the words
  uncolored; if they fail to load, an alert in the card says so, and the filter and the navigation
  still work.
- `model-reasoning-readings.tsx`: the three pathway readings, Pathway 1 to Pathway 3, in a scroller
  under one tooltip for them all. They share one current word, so Tab from one reading to the next
  lands on the same word. The current word isn't kept: the readings are keyed by the message, so a
  new message starts with none, and with no tooltip. The scroller isn't a Tab stop of its own (see
  `docs/accessibility.md`).
- `model-reasoning.scss`: the layout. The card is `$width` from `src/core/message-card/layout.scss`
  wide, and narrower when the view is. It fills the height the title and the filter row leave, up
  to 800 px, and the readings scroll inside it, so the legend stays in view.

The color ramp (`wordFill` in `colors.ts`), the legend (`WordContributionLegend`), the tooltip
(`WordTooltipArea`), one pathway's reading (`PathwayReading`) and the word scores' loading
(`useWordScores`) live in `src/core/`, where other views can use them.

## Size

The minimum layout size (see `docs/accessibility.md`) is 479 × 483 px as an Interactive, inside the
designed size of 1024 × 562.

The minimum layout width, 479 px, is the card's 447 px inside the app's 16 px gutters.

The minimum layout height, 483 px, adds up from the top:
- the title and its margins, 121 px: at 479 px the 32 px heading takes two 39 px lines, and its
  0.67em margins add 42.9 px. From 629 px wide the title fits on one line, the title and its margins
  take 82 px, and the view needs only 444 px;
- a 9 px gap;
- the filter row, 44 px;
- a 9 px gap;
- the card at its smallest, 300 px: its 62 px head, its body's padding, the legend and the 28 px
  below it, and the readings' scroller, 154 px, which holds about two readings of a short message.

The view's 16 px bottom padding is the first thing to go as the window gets shorter, so it isn't
counted.

At the designed size, with the title shown, the readings' scroller is about 255 px tall, so the
readings scroll for most messages. They will have about 90 px more once the view titles leave the
Interactives.

Narrower than its minimum layout width, it still works, but no reviewed design covers it:
- The view stays one column, the card takes the full width between the gutters, and the words wrap
  onto more lines.
- The title wraps onto more lines, three at 320 px. At 320 × 562 the card is still 324 px tall and
  the page doesn't scroll down.
- Nothing scrolls sideways, even at 320 px.

## Still to come

The view still needs:
- the flow on the right;
- the steps;
- hiding the word colors until Activate.
