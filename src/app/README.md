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

`App` (`components/app.tsx`) reads `?interactive=` once. If it is present, the page is in
interactive mode: that view is shown alone and the hash is ignored. Otherwise
`StandaloneLayout` shows the view nav and follows `#view=`. An id that is not in the registry
shows "Unknown view" with the list of valid ids, in either mode.

## Adding a view

1. Create `src/views/<view-id>/<view-id>.tsx` exporting the view component. It may import only
   from `src/core/`.
2. Add it to `VIEWS` in `views.ts`, at its place in the lesson order.
3. Update the expected id list in `views.test.ts` and the view list in the top-level README.

View ids are embedded in AP activities, so never rename or remove one that has shipped.
