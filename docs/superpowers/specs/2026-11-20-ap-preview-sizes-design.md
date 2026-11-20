# Activity Player Preview and Sizes — Design

## Overview

To see how a view looks in the Activity Player (AP), a developer or designer today has to embed it
in an activity. This chore adds a dev page, `ap-preview.html`, that shows any view in an iframe sized
the way the AP would size it for the settings an author picks in LARA, in the real browser window.
It is for developers and designers to see how each view works on different pages, and so to work
out which settings the app's library interactive (the managed interactive authors embed) should
have in LARA.
It also gives the views back the room their title takes inside the AP, whose own bar already names
them, and writes down why the views are designed at the size they are and which AP settings give
it.

Jira: [NPW-75](https://concord-consortium.atlassian.net/browse/NPW-75). It came out of NPW-23
([PR #54](https://github.com/concord-consortium/neural-pathways/pull/54)), which found that the
view's unstyled `h1` takes 82 px of the 562 px designed height. NPW-23 is rebased onto this chore
afterward and sets Looking Inside's diagram height from the room the title gives back.

Sources:
- the AP at `~/Development/activity-player`, commit `3a38f74d`;
- LARA at `~/Development/lara`, commit `3499f294`;
- the prototype's device preview, `index.html` at `7acc4db` on the demos repo's `neural-net-maker`
  branch (`AP_WIDTH`, `AP_CONTENT_H`, `AP_HEADER_H`, `SHOW_SIM_TITLE_BAR`).

The main numbers below were checked in Chrome against the deployed AP
(`activity-player.concord.org/branch/master`) by switching section and page classes in the DOM.

## Goals

- A developer or designer can pick a view and the settings an author would pick in LARA, using
  LARA's labels, and see the view at the size the AP would give it in their current window.
- The view, the settings and the size are in the URL, so a preview can be bookmarked and shared.
- In an Interactive, a view neither shows nor announces its own title. The standalone app still
  shows it.
- The docs say why the views are designed for 1024 × 562 px or less, how the AP sets an
  Interactive's width and height, and which AP settings give the designed size.
- Each view's documented minimum layout size is re-measured without the title.

## Non-goals

- Changing a view's layout to fit. NPW-23 does that for Looking Inside.
- Designing for widths below a view's minimum layout width.
- Using the interactive API (`supportedFeatures`, `height`) to tell the AP a size. The app doesn't
  use the API at all; the docs name it as a possible follow-up.
- Reproducing a student's actions in the AP, such as collapsing the secondary column.
- LARA's activity-level layouts other than Multiple Pages. Single Page and Notebook change the
  sizes; the preview assumes Multiple Pages and its readout says so.
- An interactive with no name. The AP then draws no header bar, and the view would have no heading.
  The docs say we assume authors always name it; the preview always draws the bar.

## Anti-goals

- A preview whose numbers drift from the AP's. A tester trusts it in place of embedding the view,
  so a size it shows that the AP wouldn't give is worse than no preview. The size math is in one
  tested module that cites the AP's code.
- A visually hidden title in an Interactive. A screen reader would read the view's name in the AP's
  bar and again inside the iframe.

## Approaches

| Approach | Trade-offs | Picked |
|---|---|---|
| Its own React page, like `heatmap.html` and `explorer.html` | The view list comes from the registry, the size math gets types and unit tests, and it deploys with the lab pages. Importing `VIEWS` pulls every view component into the preview's bundle. | **Yes.** The size math is the part that has to be right, and the AP may change it, so it should be tested and easy to update. |
| A static HTML page with an inline script | Cheapest. The view list would be a hand-kept copy, and the formulas would have no types or tests. | No |
| A mode of the main app (`index.html?ap-preview`) | No new page, but it puts a dev tool in the student app's code, and the app would frame itself. | No |

## Decisions

| Decision | Choice | Why |
|---|---|---|
| The title in an Interactive | Not rendered at all. The standalone app keeps its visible `h1`. | A visually hidden `h1` would be read twice. The v1.4 prototype also draws no title of its own in the AP (`SHOW_SIM_TITLE_BAR = false`). |
| The AP's header bar | Assumed always there: the docs say we assume authors always name the interactive. The preview always draws it, naming the view, with no control to hide it. | The AP draws the bar only when the interactive has a name, question number, hint, or a plugin or layout that needs it (AP `managed-interactive.tsx:397`). With the title gone, the bar is the view's only name. |
| Which kind of interactive | A managed interactive: the preview includes its 1 px border. The controls stay LARA's aspect-ratio fields, without the inherit/customize choice. | The app is embedded through a library interactive. Its sizing fields are the same as a plain iframe interactive's, set once on the library entry so authors don't set them each time. The preview is how we choose those settings. |
| Activity-level layout | Multiple Pages, stated in the readout and the docs. | The usual layout. Single Page and Notebook change the sizes and aren't modeled. |
| What the controls offer | LARA's settings, with LARA's labels: the page's fixed width, the section's layout, which column the interactive is in, and its aspect ratio with width and height. | Testers and authors know these labels, and they map one to one to the activity JSON the AP reads. |
| Window size | The preview uses the real window, as the AP does. Resizing it resizes the iframe. | The AP's responsive widths and its height caps both depend on the window. A typed-in window size would show sizes the tester's screen can't give. |
| Presets | A list that fills in the settings. The designed size is shown as text, not as a preset. | No combination of AP settings gives exactly 1024 px wide, so a 1024 preset would show a size the AP never gives. |
| URL | The view and the settings go in the hash, named as the activity JSON names them. The window size doesn't. | Shareable, and a reader who knows the AP's JSON can read it. |
| Deploy | Built and deployed to S3 with the other pages, and linked from `lab.html` and the README. | The lab pages deploy, so a branch's preview is a link anyone can open. |
| Which AP settings the docs recommend | My call: set the library interactive to **Manually set the native width & height** at 1044 × 562, and put it in a **full-width (single column)** section on a **Standard (1100px)** page. | It is the only combination that gives the designed height on every window, since a manual ratio has no height cap. The default 4:3 gives 1044 × 783, capped by the window. Setting it on the library interactive means each embed inherits it. |

## The AP's sizes

These are what the preview reproduces and what the docs explain. W is the AP's `#app` width: the
window's `innerWidth`, less the scrollbar when the browser shows a classic one, so
`document.documentElement.clientWidth` in the preview. H is `window.innerHeight`.

### What an author sets in LARA

| LARA field | Label | JSON value |
|---|---|---|
| Activity Page Fixed Width | Standard (1100px) (default) | `fixed_width_layout: "1100px"` |
| | iPad Friendly (960px) | `"ipad_friendly"` |
| Layout (per section) | full-width (single column) (default) | `layout: "full-width"` |
| | 60-40 (primary on left) | `"60-40"` |
| | 40-60 (primary on right) | `"40-60"` |
| | 70-30 (primary on left) | `"70-30"` |
| | 30-70 (primary on right) | `"30-70"` |
| | responsive-30-70 (primary on right) | `"responsive-30-70"` |
| | responsive-50-50 (primary on right) | `"responsive-50-50"` |
| | responsive-full-width (single column) | `"responsive-full-width"` |
| Aspect Ratio (per interactive) | Default aspect ratio, or set by interactive (default) | `aspect_ratio_method: "DEFAULT"` |
| | Manually set the native width & height | `"MANUAL"`, with `native_width`, `native_height` (default 576 × 435) |
| | Use all available space for the interactive | `"MAX"` |

Citations: LARA `fixed_width_layout.rb:2-11`, `authoring-section.tsx:275-288`,
`section-layout-utils.ts:31-40`, `aspect-ratio-chooser.tsx:4-8`. The aspect-ratio fields are set on
the library interactive; an embed inherits them unless the author picks "Customize", which writes
`custom_aspect_ratio_method`, `custom_native_width` and `custom_native_height`
(`managed-interactives/customize.tsx:234-287`). The AP sizes both the same way
(`use-aspect-ratio.ts:23-44`), so the preview has one set of fields and uses the plain names in its
URL. There is no page-level
responsive option: the AP makes the page as wide as the window when any section's layout contains
"responsive" (AP `app.tsx:562-575`), and then ignores the fixed width. `responsive` and
`responsive-2-column` are legacy layouts an author can't pick, so the preview leaves them out.

### Width

On a fixed page the section's content is the page less 56 px: 20 px of page padding and 8 px of
section margin on each side. So C = 1044 on the 1100 page and 904 on the 960 page. The `.app`'s
40 px padding on each side sits outside the page. A fixed page doesn't change with the window; a
narrow window scrolls sideways.

| Layout | Primary column | Secondary column |
|---|---|---|
| full-width | C | – |
| 60-40, 70-30 | 10 columns with 10 px gaps; a span of n is n(C − 90)/10 + 10(n − 1), n = 6 or 7 | the rest, n = 4 or 3 |
| 40-60, 30-70 | `minmax(45px, auto) repeat(9, 1fr)`, fr = (C − 135)/9; 6 or 7 fr plus gaps | the 45 px track plus 2 or 3 fr and gaps |
| responsive-full-width | W − 140 | – |
| responsive-30-70 | W − 515 | 365 |
| responsive-50-50 | (W − 120)/2 − 30 | (W − 120)/2 |

Measured values to test against, on the 1100 page: 60-40 is 622.4 / 411.6, 70-30 is 727.8 / 306.2,
40-60 is 656 / 378, 30-70 is 767 / 267. On the 960 page: 538.4 / 355.6, 629.8 / 264.2,
562.7 / 331.3, 658.1 / 235.9. Sources: AP `section.scss:4-13,63,102,121-168`,
`activity-page-content.scss:7`, `app.scss:65`.

A responsive section is 100% of W − 120 and its 8 px margin overflows rather than shrinking it. A
responsive-full-width embeddable adds a 20 px right margin, so the iframe is W − 140. **The story
and the drafted docs commit say W − 156; that is wrong, and this chore corrects it.** On a 1024 px
landscape iPad, whose scrollbars overlay, that iframe is 884 px wide, not 868.

A managed interactive always has a 1 px border (AP `managed-interactive.tsx:402`,
`managed-interactive.scss:5-7`). It is content-box and overflows the column by 2 px; the iframe
stays the column's width. Nothing here has a min-width, max-width or media query.

### Height

D is the column's width from above. The AP's height logic is `use-aspect-ratio.ts`. The header and
delete-data terms in it are always 0 (`managed-interactive.tsx:90,94,119`), so the only fixed
subtraction is its 15 px bottom margin. M = 0.98 × H.

- **Default:** the app doesn't use the interactive API, so the ratio is always 4:3. If
  D × 3/4 ≤ M − 15, the iframe is D × D·3/4. Otherwise the height is M − 15, and the width narrows to
  min(D, M × 4/3), left-aligned (`use-aspect-ratio.ts:66-74`). Note the width uses M, not M − 15.
  Measured at a 1400 × 600 window, full-width on the 1100 page: 784 × 573.
- **Manual:** the height is D × native_height / native_width, with no cap.
- **Use all available space:** the iframe's height attribute stays at the AP's 300 px default
  (`iframe-runtime.tsx:43,603`) unless CSS stretches it. That happens only in a full-width section
  and in a primary column of a two-column layout (`section.scss:15-33,189-209`). There the iframe is
  M − 30 (the buttons below it) − 36 (the header bar) − 2 (the managed interactive's border).
  Elsewhere — a secondary column,
  or a responsive-full-width section, whose section class is `responsive` so the full-width rule
  never matches — it stays 300 px. The preview says so in its readout when that happens.

Nothing above the section (the AP's header, nav or banners) enters this math; it uses only
`innerHeight` and `98vh`.

## The preview page

A sketch of what the tester sees, top to bottom:

```
┌ Activity Player preview ─────────────────────────────────────────────────────────┐
│ View [Looking Inside a Neural Network ▾]   Preset [Full-width, manual 1044×562 ▾]│
│ ┃PAGE AND SECTION                          ┃INTERACTIVE                          │
│ ┃Activity Page Fixed Width [Standard ▾]    ┃Aspect Ratio [Manually set the… ▾]   │
│ ┃Layout [full-width (single column) ▾]     ┃Width [1044] Height [562]            │
│ ┃Interactive's column [Primary ▾] (2-col)  ┃                                     │
│ Iframe 1044 × 562 px · window 1440 × 900       Designed for 1024 × 562 px or less│
│ Width 1044: 1100 page − 56. Height: width × 562 / 1044, not capped.              │
└──────────────────────────────────────────────────────────────────────────────────┘
   ┌ page (1100, 960, or full width) ─────────────────────────────────────┐
   │ ┌ Looking Inside a Neural Network ───────────── (teal 36 px bar) ┐   │
   │ │ <iframe src="index.html?interactive=looking-inside">            │   │
   │ │                                                    1044 × 562   │   │
   │ └─────────────────────────────────────────────────────────────────┘   │
   └───────────────────────────────────────────────────────────────────────┘
```

The mockup this was agreed from is `.superpowers/brainstorm/*/content/ap-preview-v2.html` (not
committed).

- **The controls**, each a labeled native `select` or number input:
  - **View**: every entry in `VIEWS`, by title.
  - **Preset**: fills in the settings below. Changing any setting by hand clears it back to "choose a
    preset". The presets:
    - Full-width, manual 1044 × 562 (designed height) — the default when the URL has no settings
    - Full-width, default aspect ratio (what a new library interactive gets)
    - Full-width, use all available space
    - Responsive full-width, manual 1044 × 562
    - Responsive full-width, default aspect ratio
    - iPad Friendly page, full-width, manual 1044 × 562
    - 60-40, interactive in primary column, default aspect ratio
  - **Activity Page Fixed Width**, **Layout** and **Aspect Ratio**, with LARA's labels from the
    table above. The fixed width is disabled when the layout is responsive, with a note saying a
    responsive section makes the page full width.
  - **Interactive's column**: Primary or Secondary, shown only for two-column layouts. This isn't a
    LARA field; in LARA it's where the author puts the interactive in the section.
  - **Width** and **Height**: shown only for the manual aspect ratio.
- **The readout**: the iframe's size in px, the window's size, a line saying how each number was
  worked out, any warning (the 300 px fallback), "Views are designed for 1024 × 562 px or less",
  and that it assumes a Multiple Pages activity and a managed interactive with a name.
  It updates on every change and on window resize. It's a live region.
- **The page below** copies the AP's structure at real sizes: the `.app` padding, the page (fixed
  or full width) with its padding, the section with its margin, and for two-column layouts a
  placeholder for the other column at its real width on the correct side. The interactive gets the
  AP's header bar — 36 px, `#0481a0`, white text in an `h2` naming the view, as in
  `managed-interactive-header.tsx` and `embeddable.scss` — then the iframe at the computed size,
  inside the managed interactive's 1 px border, then the 30 px the AP's buttons take below it. The iframe's `src` is
  `index.html?interactive=<id>` and its `title` is the view's title.
- **The URL hash**: `view`, `fixed_width_layout`, `layout`, `column` (two-column layouts only),
  `aspect_ratio_method`, and `native_width` and `native_height` (manual only). The page reads it on
  load and on `hashchange`, and writes it with `history.replaceState` on every change. Unknown or
  missing values fall back to the default preset's.
- **Sideways scrolling**: when the page is wider than the window, the window scrolls sideways, as
  the AP's does. Nothing is scaled to fit.

### Code layout

- `src/ap-preview/`: the entry (`index.tsx`, `index.html`), the page component, and the size math.
- The size math is a pure module: given the settings and the window's W and H, it returns the
  column widths, the iframe's width and height, the explanation and any warning. Each formula has
  a comment citing the AP or LARA file and line it copies. It has no DOM or React in it.
- `webpack.config.js`: an `ap-preview` entry and an `HtmlWebpackPlugin` page `ap-preview.html`,
  like `heatmap.html`.

## Dropping the title in an Interactive

Today only `src/app/components/app.tsx` knows about interactive mode: it wraps the view in
`.interactive-view`. Interactive mode is passed down through `ViewContent` to the views, and in
interactive mode they don't render their `h1`. The `h1`s are in:

- `src/views/looking-inside/looking-inside.tsx`
- `src/views/extract-pathways/extract-pathways.tsx`
- `src/core/view-placeholder/view-placeholder.tsx`

In an Interactive the view's top heading is then the panels' `h2`, under the AP's own `h2`. The
About dialog's heading ("About" and the view's title) is unchanged.

## Testing

- **The size math**: a unit test per layout and page width, using the measured values above, plus
  the responsive formulas at a couple of window widths; the default's capped and uncapped cases,
  including 784 × 573 at 1400 × 600; manual; and all available space where it applies and where it
  falls back to 300 px.
- **The hash**: reading and writing round-trips, and unknown values fall back to the defaults.
- **The title**: an Interactive has no `h1` and the standalone app does, for each view that renders
  one.
- **The page**: a Playwright check that `ap-preview.html` with a given hash loads the right view in
  the iframe at the expected size, and that resizing the window resizes a responsive layout's
  iframe.

## Docs

- **Bring over NPW-23's commit `0caf0ac`** (`docs/accessibility.md`: the "1024 px wide" bullet and
  a Known gaps bullet on responsive pages) with its message reworded for NPW-75. Expect a small
  conflict with NPW-23's text about Looking Inside; keep `main`'s surrounding text. Then correct its
  156 px to 140 px and 868 px to 884 px.
- **`docs/accessibility.md`, "Fit the designed size"**: why 1024 × 562 (1024 is a view on its own
  on a landscape iPad and the prototype's `standaloneMax`; the common use is the 1044 px full-width
  section on the AP's 1100 px page; 562 is an Interactive's height on a 1366 × 768 Chromebook), how
  the AP sets an Interactive's width and height (a short version of "The AP's sizes"), and the
  recommended settings: the library interactive set to "Manually set the native width & height" at
  1044 × 562, in a full-width section on a Standard (1100px) page. Say that responsive layouts and
  the default aspect ratio don't give the designed size, and that reporting a height through the
  interactive API is a possible follow-up. Say we assume authors always give the interactive a
  name: the AP's bar shows it, and the view has no title of its own in an Interactive. Say the
  sizes assume a Multiple Pages activity. Point to `ap-preview.html`, and to DevTools' device toolbar on
  `?interactive=<id>` at an exact size as a quick check without it.
- **Each view's README and `src/app/README.md`**: the minimum layout size re-measured with the
  title gone (measured, not computed). On `main`, Looking Inside's is 910 × 524 with the title and
  Extract the Neural Pathways' height is 680; each should drop by about 82 px. `src/app/README.md`
  says interactive mode leaves the title out, and why.
- **The README and `lab.html`**: link to `ap-preview.html`.

## Left to the builder

- Whether to split each view's id and title out of `VIEWS` so the preview doesn't bundle every view
  component. Either is fine for a dev page.
- How interactive mode reaches the views: a prop through `ViewContent` or a React context.
- Styling the controls beyond the sketch, within the repo's accessibility rules: labeled controls,
  keyboard reachable, text not scaled to fit.
