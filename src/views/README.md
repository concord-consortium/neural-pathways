# views

One folder per lesson view (Trace a Case, Extract Pathways, …). The app lists them in
`src/app/views.ts`.

A view may import from `src/core/` only: not from `src/app/`, `src/lab/`, or another view.
Anything two views share belongs in `src/core/`. Every line here is reviewed; see
`src/core/README.md`.
