# Interactive Title and Activity Player Sizes — Design

## Overview

A view embedded in the Activity Player (AP) as an Interactive shows its own title, though the AP's
title bar above the iframe already names it. This chore gives the views back the room their title
takes inside the AP. It also writes down why the views are designed at the size they are, how the
AP sizes an Interactive, and which AP settings give the designed size.

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
- LARA's activity-level layouts other than Multiple Pages. Single Page and Notebook change the
  sizes; the docs assume Multiple Pages and say so.
- An interactive with no name. The AP then draws no title bar, and the view would have no heading.
  The docs say we assume authors always name it.

## Anti-goals

- A visually hidden title in an Interactive. A screen reader would read the view's name in the AP's
  title bar and again inside the iframe.

## Approaches

| Approach | Trade-offs | Picked |
|---|---|---|
| Leave the `h1` out in an Interactive | The AP's title bar is then the view's only name, so we assume authors name the interactive. | **Yes.** It gives back the room and names the view once. |
| Hide the `h1` visually in an Interactive | Gives back the room and keeps a heading inside the iframe, but a screen reader reads the name twice. | No |
| Keep the visible title | Costs 82 px of the 562 px designed height, and repeats the AP's title bar. | No |

## Decisions

| Decision | Choice | Why |
|---|---|---|
| The title in an Interactive | Not rendered at all. The standalone app keeps its visible `h1`. | A visually hidden `h1` would be read twice. The v1.4 prototype also draws no title of its own in the AP (`SHOW_SIM_TITLE_BAR = false`). |
| The AP's title bar | Assumed always there: the docs say we assume authors always name the interactive. | The AP draws the bar only when the interactive has a name, question number, hint, or a plugin or layout that needs it (AP `managed-interactive.tsx:397`). With the title gone, the bar is the view's only name. |
| Activity-level layout | Multiple Pages, stated in the docs. | The usual layout. Single Page and Notebook change the sizes and aren't modeled. |
| Which AP settings the docs recommend | My call: set the library interactive to **Manually set the native width & height** at 1044 × 562, and put it in a **full-width (single column)** section on a **Standard (1100px)** page with no responsive section. | It is the only combination that gives the designed height on every window, since a manual ratio has no height cap. The default 4:3 gives 1044 × 783, capped by the window. Setting it on the library interactive means each embed inherits it. A responsive section anywhere on the page makes the whole page as wide as the window (AP `app.tsx:562-575`), so the full-width section would follow the window too. |

## The AP's sizes

These are what the docs explain. W is the AP's `#app` width: the window's `innerWidth`, less the
scrollbar when the browser shows a classic one. H is `window.innerHeight`.

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
(`use-aspect-ratio.ts:23-44`), so the docs describe one set of fields. There is no page-level
responsive option: the AP makes the page as wide as the window when any section's layout contains
"responsive" (AP `app.tsx:562-575`), and then ignores the fixed width. `responsive` and
`responsive-2-column` are legacy layouts an author can't pick, so the docs leave them out.

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

Measured values on the 1100 page: 60-40 is 622.4 / 411.6, 70-30 is 727.8 / 306.2, 40-60 is
656 / 378, 30-70 is 767 / 267. On the 960 page: 538.4 / 355.6, 629.8 / 264.2, 562.7 / 331.3,
658.1 / 235.9. Sources: AP `section.scss:4-13,63,102,121-168`, `activity-page-content.scss:7`,
`app.scss:65`.

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
  and in a primary column of a two-column layout (`section.scss:15-33,189-209`), and the
  primary-column rule reads only `custom_aspect_ratio_method` (`section.tsx:133-139`). So an embed
  that inherits MAX from its library interactive, which is what the docs assume, stays at 300 px in
  a primary column too. Where it stretches, the iframe is M − 30 (the space below it) − 36 (the
  title bar) − 2 (the managed interactive's border). Elsewhere — a secondary column, or a
  responsive-full-width section, whose section class is `responsive` so the full-width rule never
  matches — it stays 300 px.

Nothing above the section (the AP's header, nav or banners) enters this math; it uses only
`innerHeight` and `98vh`.

## Dropping the title in an Interactive

Today only `src/app/components/app.tsx` knows about interactive mode: it wraps the view in
`.interactive-view`. Interactive mode is passed down to the views, and in interactive mode they
don't render their `h1`. The `h1`s are in:

- `src/views/looking-inside/looking-inside.tsx`
- `src/views/extract-pathways/extract-pathways.tsx`
- `src/core/view-placeholder/view-placeholder.tsx`

In an Interactive the view's top heading is then the panels' `h2`, under the AP's own `h2`. The
About dialog's heading ("About" and the view's title) is unchanged.

## Testing

- **The title**: an Interactive has no `h1` and the standalone app does, for each view that renders
  one.
- **The top padding**: in an Interactive, each view in the nav pads its top by 9 px.
- **The minimum layout heights**: Looking Inside's minimum-layout Playwright test uses the
  re-measured height.

## Docs

- **Bring over NPW-23's commit `0caf0ac`** (`docs/accessibility.md`: the "1024 px wide" bullet and
  a Known gaps bullet on responsive pages) with its message reworded for NPW-75. Expect a small
  conflict with NPW-23's text about Looking Inside; keep `main`'s surrounding text. Then correct its
  156 px to 140 px and 868 px to 884 px.
- **`docs/accessibility.md`, "Fit the designed size"**: why 1024 × 562 (1024 is a view in the
  standalone app on a landscape iPad and the prototype's `standaloneMax`; the common use is the
  1044 px full-width section on the AP's 1100 px page; 562 is an Interactive's height on a
  1366 × 768 Chromebook), and the recommended settings: the library interactive set to "Manually
  set the native width & height" at 1044 × 562, in a full-width section on a Standard (1100px) page
  with no responsive section. Say that responsive layouts and the default aspect ratio don't give
  the designed size, and that reporting a height through the interactive API is a possible
  follow-up. Say we assume authors always give the interactive a name: the AP's title bar shows it,
  and the view has no title of its own in an Interactive. Say the sizes assume a Multiple Pages
  activity. Point to DevTools' device toolbar on `?interactive=<id>` at an exact size to check a
  view.
- **`docs/activity-player-sizing.md`**: how the AP sets an Interactive's width and height, a short
  version of "The AP's sizes". It isn't about accessibility, so it has its own doc, which
  `accessibility.md` links to.
- **Each view's README and `src/app/README.md`**: the minimum layout size re-measured with the
  title gone (measured, not computed). On `main`, Looking Inside's is 910 × 524 with the title and
  Extract the Neural Pathways' height is 680; each should drop by about 82 px. `src/app/README.md`
  says interactive mode leaves the title out, and why.

## Left to the builder

- How interactive mode reaches the views: a prop through `ViewContent` or a React context.
