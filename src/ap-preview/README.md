# Activity Player preview

`ap-preview.html` shows a view in an iframe at the size the Activity Player would give it, for the
settings you pick under LARA's labels, in your window. It is for developers and designers working
out which settings an interactive should have in LARA, and for checking how a view looks at that
size. The chosen view and settings are kept in the URL's hash, so a link opens the same preview.

`ap-preview` may import from `src/app/`, `src/views/` and `src/core/`, and nothing imports from it.
Every line here is reviewed, though students don't see it; see `src/core/README.md`.

## What's here

- `ap-sizing.ts`: the Activity Player's sizing rules, `apSize`, which gives the iframe's width and
  height for a set of settings and a window. Each formula names the Activity Player code it copies.
- `measurements.md`: the sizes measured in the Activity Player that `ap-sizing.ts` is tested
  against, and how to measure them again.
- `preview-state.ts`: the view and settings, read from and written to the URL's hash, and the
  presets.
- `use-window-size.ts`: the window's width, less any vertical scrollbar, and height.
- `components/`: the page. `ap-preview.tsx` holds the state; `preview-controls.tsx` has the controls
  under LARA's labels; `size-readout.tsx` gives the iframe's size and how it was worked out;
  `ap-page.tsx` draws the Activity Player's page around the iframe at its real size.

The preview is tied to this app in two places: it lists the views from `src/app/views.ts`, and
loads each as `index.html?interactive=<view-id>`. Everything else is about the Activity Player.

## How the Activity Player sizes an Interactive

[docs/activity-player-sizing.md](../../docs/activity-player-sizing.md) explains it. One difference:
in a window narrower than a fixed page, the Activity Player cuts off the page's left side, but the
preview scrolls sideways, so the whole interactive can be seen.
