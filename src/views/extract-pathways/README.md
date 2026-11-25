# Extract the Neural Pathways

The lesson's second view: lift the 14 hidden neurons out of the network, collect the activations
of messages run through it into a deck, one column each, then draw the three pathways from
the deck.

## What's here

- `extract-pathways.tsx`: the view. It loads the alien3 messages and shows the step row above
  one full-width panel holding the drawing. The panel's head holds the activation legend, the
  loading legend (hidden until Extract Pathways' lines arrive, then sliding in), a rule and the
  Animate controls. There is no filter and no message panel.
- `extract-pathways-state.ts`: the view's saved state, `ExtractPathwaysState`: whether Setup is
  done, how many messages are collected, whether the deck and the pathways are done, and
  Animate and the speed. A stage still playing isn't stored.
- `extract-steps.ts`: the buttons and the marker, on the shared step system in
  `src/core/steps/`.
- `extract-scene.ts`, `setup-timeline.ts`, `collect-timeline.ts`, `collect-all-timeline.ts`,
  `extract-timeline.ts`, `pathways-timeline.ts`: what the view draws at any moment, as pure
  functions of the marker and the time into a segment, at the prototype's "Medium" speed.
- `extract-geometry.ts`, `flight.ts`, `extract-drawing.tsx`: the canvas. The network sits in the
  middle, the lifted column in the right strip, the deck in the left (see `ExtractDrawing`). Copies
  of the hidden neurons fly on curved paths, landing in order and settling.
- `deck-layout.ts`: the deck that Collect All builds: its size, its sets of 20, where each set sits
  in deck radii, and the timings that depend on a column or a set.
- `transitions.ts`: a value carried by CSS-style transitions, each starting from wherever the last
  left it.
- `deck-drawing.tsx`: the deck's sets, memoized (see `DeckSet`), and the depth shading of its faces.
- `pathways-layout.ts`: where the loading bars, their zero rules and the pathway boxes go once the
  deck and the lifted column have slid, for the alien3 factor-analysis fit's loadings
  (`alien3Loadings`), which the view reads from the index.
- `particles.ts`: the particles that carry the deck's readings to the bars: a seeded plan of their
  timing, their curves, and the gauges on the deck's faces they leave from.
- `pathways-drawing.tsx`: the bars, the bar copies flying to the boxes, the boxes and the lines, in
  SVG, with the pick's loadings alone lit; and the particles, painted on the particle canvas over
  the SVG while they fly.
- `pick.ts`: what is picked, a lifted neuron or a pathway, and the rules for lighting and
  toggling a pick.
- `pick-targets.tsx`: the buttons over the lifted neurons and the pathway boxes, their keyboard
  handling, and the tip, on a transparent SVG over the drawing. Offered only at rest after Extract
  Pathways.
- `loading-legend-reveal.ts`: how far the loading legend in the panel's head has slid open and faded
  in, from the pathways' lines.

The pick is the view's own state, in `ExtractPathwaysBody`: any step button or Reset clears it, and
the drawing ignores it unless the pick targets are shown. The drawing's description names the
picked neuron's or pathway's loadings.

## Size

The minimum layout size (see `docs/accessibility.md`) is 915 × 562 px as an Interactive, inside the
designed size of 1024 × 562 with no height to spare.

The minimum layout width, 915 px, is the canvas's narrowest layout, 881 px (`minCanvasWidth` in
`extract-geometry.ts`), with the panel's border and the app's 16 px gutters. The strips set it: at
881, the left strip holds the deck's columns collected by hand with 10 px clear. The finished deck
of 800 fits between the canvas's left edge and the lifted column with about 11 px to spare in all,
beyond its 10 px clear each side. Once Extract Pathways is done, the pathway labels end inside the
canvas too. Narrower, the canvas scrolls sideways inside its panel and the step row wraps, down to
320 px.

The panel's head must also hold the title, both legends and the Animate controls on one line at
915 px, with the web fonts loaded. It does, with room to spare: measured in Chromium through
Playwright on a Mac, with Extract Pathways done, the head stays one line down to an Interactive
801 px wide, 114 px under the minimum. Chrome on Linux draws text about 2 px wider (see Looking
Inside's README), which doesn't touch that. In the fallback font, which is wider, the head wraps
below about 993 px, the legends and the controls dropping below the title, and the page then
scrolls down in a 562 px Interactive (`docs/accessibility.md` has the sizes). That is accepted, as
it is for Looking Inside's head.

About sits at the right end of the step row, with the steps centered on the panel. Below 820 px it
goes on its own line below the steps.

The minimum layout height, 562 px, adds up from the top:
- the view's 9 px top padding, which takes the title's place in an Interactive;
- the step row, 44 px;
- a 9 px gap;
- the panel, 484 px: the canvas's 404 px (`CANVAS_HEIGHT`), and 80 px for the panel's head, padding
  and border;
- the view's 16 px bottom padding.

Nothing in the view gives way as the window gets shorter, not even the padding, so the page scrolls
down below 562 px. The standalone app has no top padding, and shows the view's title above the
step row instead: 82 px for a 32 px heading's line and its
0.67em margins, then a 9 px gap.
