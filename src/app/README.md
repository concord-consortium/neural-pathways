# app

The student app: the entry point, the view registry, the standalone layout with its view
navigation, and interactive mode for the Activity Player (AP).

`app` may import from `src/views/` and `src/core/`, never from `src/lab/` or `scripts/`. Every
line here is reviewed; see `src/core/README.md`.

## Vocabulary

- **View**: one unit of the lesson (Trace a Case, Extract Pathways, …). The code's name for it.
- **Interactive**: a view embedded in the Activity Player, via `index.html?interactive=<view-id>`.
- **Interactive mode**: how the app runs as an Interactive: the view alone, filling the frame,
  with no nav. Later it also talks to the AP through the LARA interactive API, for example
  waiting for saved interactive state before rendering.
- **Standalone app**: `index.html` without that param. A list of views on the left; the
  selection is kept in `#view=<view-id>`.

## Modes

`App` (`components/app.tsx`) decides the mode from `?interactive=`. If it is present, the page is
in interactive mode: that view is shown alone and the hash is ignored. Otherwise
`StandaloneLayout` shows the view nav and follows `#view=`. An id that is not in the registry
shows "Unknown view" with the list of valid ids, in either mode.

When the standalone app changes view, it scrolls the new view to the top and announces its title
in a status region. Focus stays on the nav link, so a student can keep stepping through the
views. In both modes the page title names the view, and the shell, not the view, owns the gutter
around it.

## Adding a view

1. Create `src/views/<view-id>/<view-id>.tsx` exporting the view component. See
   `src/views/README.md` for what a view may import.
2. Add it to `VIEWS` in `views.ts`, at its place in the lesson order.
3. Update the expected id list in `views.test.ts` and the nav link count in
   `playwright/app.test.ts`.

View ids are embedded in AP activities, so never rename or remove one that has shipped.
