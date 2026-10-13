# About Button and Dialog — Design

## Overview

Every view gets an About button that opens a dialog explaining the view. Trace a Case and Extract
Pathways get it in its final place, at the right end of their toolbar row. The five views that
aren't built yet get it in their placeholder, and each view's own story moves it to its final place.

Jira: [NPW-44](https://concord-consortium.atlassian.net/browse/NPW-44). It builds on NPW-60
([PR #44](https://github.com/concord-consortium/neural-pathways/pull/44)), which sets the designed
size of 1024 × 562 px and each view's minimum layout size, and this branch is stacked on it. About
makes Trace a Case's toolbar row wider, so this changes the minimum layout width NPW-60 records for
that view.

Not in this story: neuron hover, Step 1's word flights, and the activation legend.

The source is the prototype's `index.html` on the `neural-net-maker` branch of the demos repo
([live](https://models-resources.concord.org/demos/branch/neural-net-maker/)), at commit `74d66f3`.
Line numbers below refer to that file:
- the button: `makeAboutButton` at 4836, and its CSS (`.nnm-about-btn`) at 876–901;
- the dialog: `openAboutModal` at 4860–4993, and its CSS (`.info-modal`) at 548–706;
- the icons: `infoIconSVG` at 4794 and `closeIconSVG` at 4821;
- the text: `SIMS` at 4366–4492;
- the placement: Trace a Case's toolbar at 10825–11030 and its CSS at 1841–1843 and 1980–1991,
  Extract Pathways' CSS at 2437–2439, and the placeholder's `.nnm-blankhead` at 895.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Which views get the button | All seven: Trace a Case and Extract Pathways in their final place, the other five in their placeholder. | As the ticket says. About works in every view in the nav, and each view's layout is built with it in place. |
| Where it goes in Trace a Case | At the right end of the steps cell, after Reset. | As in the prototype, where About sits hard right in the toolbar row after the steps. |
| What Trace a Case does when About doesn't fit beside the steps | The two-column layout's minimum width grows so About always fits on the step line. Below that the columns stack, and About is on the full-width step line. | At NPW-60's 889 px About is about 20 px short of room. Wrapping it onto a second line there would make the view about 50 px taller, past the 562 px designed height, which breaks NPW-60's first rule. The new width, about 910 px, is still inside the designed 1024 px. |
| Where it goes in Extract Pathways | At the right end of the toolbar row, with the steps still centered on the panel. Below a breakpoint, on its own line below the steps. | As in the prototype, where About is pinned right and the steps are centered. Below the breakpoint the visual order still matches the tab order: steps, then About. |
| Modal or not | Modal: a native `<dialog>` opened with `showModal()`, with Tab wrapped around its controls. | The prototype traps focus and marks itself `aria-modal`. The native dialog gives the inert background and Escape for free. It lets Tab leave for the browser, or the page around an iframe, so the dialog wraps Tab itself. |
| Dragging | Not built. | The prototype's header drag and Alt+Arrow moves are more to build and test, and nothing in the lesson depends on them. |
| The dialog's heading | "About" and the view's title, such as "About Trace a Case". | It matches the h1 the student sees above. The prototype's student-facing names ("Looking Inside a Neural Network") appear nowhere else in the app. |
| Whether About reopens when the student returns to the view | No. Open or closed is React state, not view state. | The ticket's note: it is momentary state, and not worth keeping. |
| How the text is written | Markdown, one `about.md` in each view's folder, rendered in the browser with `marked`. | Whoever writes the final copy edits markdown, not JSX. `marked` is small and has no dependencies. It has been ESM-only since v16, so Jest has to transform it, but that is one entry in `transformIgnorePatterns`. `react-markdown` would avoid `innerHTML`, but it and its many dependencies are ESM-only too, and each would need that entry. Rendering at build time would need a custom webpack loader and a matching Jest transform. |
| The text itself | The prototype's `SIMS[...].about`, as is. | As the ticket says. That includes the "Placeholder." opening sentences and Trace a Case's mention of clicking neurons, which isn't built yet. The final copy is a change to the markdown alone. |

## The component: `AboutButton`

`src/core/about/about-button.tsx`, with `about-button.scss`.

```tsx
interface AboutButtonProps {
  /** The view's title, as its h1 shows it. The button and the dialog are named from it. */
  title: string;
  /** The view's About text, as markdown. */
  markdown: string;
}
```

It owns the button, the `<dialog>`, and whether the dialog is open. Views can't import from
`src/app/`, so each view passes its own title, the same one its h1 shows.

### The button

- A 20 px ⓘ icon (the prototype's `infoIconSVG`, `aria-hidden`), a 5 px gap and the word "About".
- The step buttons' look: 44 px tall, 0 8 px padding, a 2 px `$rule` border with 5 px corners,
  white, `$ink-2` text in Barlow Condensed 16 px, weight 600, 0.04em letter spacing, in capitals.
  The same hover (`$surface`) and focus ring as the step buttons.
- Filled `$ink` with white text while its dialog is open, as the prototype's `.on`.
- Named "About Trace a Case" with `aria-label`. The name starts with the visible word, as
  [2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html) asks.
- `aria-haspopup="dialog"`.

### The dialog

- A native `<dialog>`, opened with `showModal()`. That makes the rest of the page inert and closes
  the dialog on Escape. Tab past the dialog's last control would still leave it, for the browser's
  own controls, or for the page around an Interactive's iframe. So the dialog wraps Tab and
  Shift+Tab around its own controls, as the prototype does.
- **The header:** the ⓘ icon (24 px, `aria-hidden`), an `h2` "About Trace a Case", and a 44 × 44
  Close button (`aria-label="Close"`, the prototype's `closeIconSVG`). The `h2` names the dialog
  (`aria-labelledby`).
- **Opening** moves focus to Close, as in the prototype.
- **Closing:** Close, Escape, or a click outside the dialog. Every way of closing puts focus back on
  the About button explicitly. Safari doesn't focus a button when it is clicked, so leaving it to
  the browser would drop focus to the page there.
- **Position:** fixed to the window, 6 px below the About button with right edges aligned, as in
  the prototype, and kept 10 px inside the window on every side. While there are at least 200 px
  below the button, it hangs there, no taller than that room, and its body scrolls, as the
  prototype's does. With less room below, as when the button is near or past the window's bottom,
  it moves up until it fits. It is placed when it opens and again when the window resizes. The
  backdrop is clear, as the prototype has none.
- **Size:** 400 px wide, but never wider than the window less 20 px, so it works at 320 px. Never
  taller than the window less 20 px. The header stays put and the body scrolls.
- **The body** is a scroller (see `docs/accessibility.md`). It uses `useKeyboardScrollable`, so it
  is a Tab stop only while it scrolls. It is a `group` named by the dialog's heading
  (`aria-labelledby`), following NPW-60's rule for a scroller inside something that already has its
  name.
- **The look,** from the prototype's `.info-modal`: a 2 px `$ink-3` border (the prototype's `#6B7280` is its placeholder theme's gray,
and `$ink-3` is the nearest token), 8 px corners, a
  `0 4px 16px rgba(0, 0, 0, 0.25)` shadow, and a white ground. A header at least 52 px tall, on `$surface`
  with a 1 px `$ink-3` rule below it. It grows when a long title, such as "About Investigate
  Unknown Pathway" in a narrow window, wraps. The heading in Lato 18 px bold. The body in Lato 16 px with 22 px lines and
  16 px 20 px 20 px padding, its `h3`s 16 px bold, 16 px above and 6 px below (none above the first),
  its paragraphs 12 px apart. No fade-in.

### The markdown

- `marked` turns the markdown into HTML, which goes into the body through
  `dangerouslySetInnerHTML`. That is safe only because the text comes from reviewed files in the
  repo, never from a student or the data. A comment says so, so the component isn't later pointed
  at other text.
- The dialog's title is the `h2`, so the files use `###` for their section headings, as the
  prototype's `h3`s.
- `marked` is ESM-only, so Jest's `transformIgnorePatterns` lets it through to the transform:
  `/node_modules/(?!marked/)`.
- Webpack imports `.md` files as text (`type: 'asset/source'`). Jest gets a transform that does the
  same, beside the SVG one in `jest/`. A `declare module "*.md"` gives the import its type.

## The views

### Trace a Case

About goes in `.trace-a-case__steps`, after the step row, pushed to the right edge
(`margin-left: auto`). The cell wraps, so About can drop below the steps when the cell is too
narrow for both. Tab order: filter, card, steps, About, network.

About stays when the filter matches nothing and the view leaves out the steps and the network: the
steps cell is still there, holding only About. Like the toolbars, About appears once the
conversations have loaded.

The two-column layout now needs the steps, Reset and About on one line, about 421 px: 329 px of
steps, a 6 px gap and about 85 px for About. That is wider than the network panel's 400 px minimum,
so it sets the second column's minimum. The container query's breakpoint and the grid's
`minmax(…, 1fr)` both change to 447 + 10 + 421 = 878 px of content. The minimum layout width becomes
about **910 px**, so the minimum layout size is about 910 × 523, still inside 1024 × 562. The
implementation measures the exact figure. One named SCSS value holds the toolbar's width, with a
comment saying what sets it.

When the columns stack, the steps cell is full width, so About is on the step line at the right.
Below about 420 px of content it wraps onto its own line, right-aligned, where NPW-60 already lets
things wrap and the page scroll down.

### Extract Pathways

The toolbar (`.extract-pathways__steps`) becomes a three-column grid, `1fr auto 1fr`: an empty
column, the steps, and About at the right end of the third column. The steps stay centered on the
panel, as now.

That needs the steps' 670 px, and room for About and a gap on each side, about 861 px of content
(about 893 px as an Interactive). The view's minimum layout width, 943 px, is wider, so its minimum
layout size doesn't change. `.extract-pathways` becomes a size container. Below the breakpoint the
toolbar is one column: the steps, centered as now, and About on its own line below them at the
right. That is below the minimum layout width, where NPW-60 already lets the step row wrap.

### The placeholders

Investigate Pathways, Prediction Chain, Correlations, Investigate Unknown Pathway and Correlations
Part 2 share one placeholder, `ViewPlaceholder` in `src/core/`: the h1, a head row with About at
its right end (the prototype's `.nnm-blankhead`), and "Coming soon." Each view passes its title and
its markdown.

### The text

One `about.md` in each view's folder, converted from the prototype's HTML: paragraphs stay
paragraphs, `<h3>` becomes `###`, and the escaped quotes and dashes become the characters
themselves.

| View | Prototype entry |
|---|---|
| Trace a Case | `d1a` |
| Extract Pathways | `d1b` |
| Investigate Pathways | `d1c` |
| Prediction Chain | `d2b` |
| Correlations | `d3a` |
| Investigate Unknown Pathway | `d3b` |
| Correlations Part 2 | `d3c` |

## Testing

**Jest**
- **`AboutButton`:**
  - The button is named "About Trace a Case" and has `aria-haspopup="dialog"`.
  - Opening shows a dialog named by its heading, with the markdown rendered as an `h3` and
    paragraphs, and moves focus to Close.
  - Close, Escape and a click on the backdrop each close it, and each puts focus back on the About
    button.
  - jsdom doesn't implement `showModal()`, so the tests stub it.
- **The `about.md` files:** every view in `VIEWS` shows an About button whose dialog has text. No
  file uses a `#` or `##` heading.
- **The `.md` Jest transform** has a test of its own, as the SVG one does.

**Playwright (Chromium)**
- **Trace a Case:**
  - At its new minimum layout size, About is on the steps' line at the right end, and the page
    scrolls neither way. NPW-60's size tests get the new width.
  - One pixel narrower, the columns stack, and About is still on the step line.
  - At 320 px, About wraps below the steps, and nothing scrolls sideways.
- **Extract Pathways:**
  - At 943 px, About is on the steps' line, and the steps are still centered on the panel.
  - Below the breakpoint, About is on its own line below the steps, at the right, and nothing
    scrolls sideways.
- **The dialog:**
  - It opens below the button, right edges aligned, with focus on Close.
  - Tab stays inside it. Escape closes it and focus returns to About, and so does a click outside
    it.
  - At 320 × 562 it fits inside the window, and its body scrolls from the keyboard.
- **A placeholder view** shows About, and its dialog holds that view's text.

**Manual:** in Safari, focus returns to About after the dialog is closed with the mouse. CI runs
Playwright only in Chromium.

## Docs

- Trace a Case's README: the Size section gives the new minimum layout width and says About sets
  it, and "About" leaves "Still to come".
- Extract Pathways' README: its toolbar holds About, About drops below the steps below the
  breakpoint, and "About" leaves "Still to come".
- `src/core/README.md`: "What's here" lists `about/` and `ViewPlaceholder`.
