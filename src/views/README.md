# views

One folder per lesson view (Trace a Case, Extract Pathways, …). The app lists them in
`src/app/views.ts`.

Within the repo, a view may import only from its own folder and `src/core/`: not from
`src/app/`, `src/lab/`, or another view. Packages such as React are fine. Anything two views
share belongs in `src/core/`. Every line here is reviewed; see
`src/core/README.md`.

## The prototype

The lesson views are built from a single-file prototype, Neural Net Maker:

- live: <https://models-resources.concord.org/demos/branch/neural-net-maker/>
- source: `index.html` on the `neural-net-maker` branch of
  [concord-consortium/demos](https://github.com/concord-consortium/demos/tree/neural-net-maker)

The views follow its layout, colors and behavior unless a spec says otherwise. Specs cite its
functions and line numbers from the version current when they were written (v1.0, commit
`74d66f3`), so check out that commit when following a line number.

Code comments, test titles and READMEs also point at the prototype, to show how each part was
translated from it. These are kept while the views are being built, and will be removed or restated
once the app stands on its own, since the prototype may not be kept up to date. Say "prototype"
in each new one, so they can all be found by searching for the word.
