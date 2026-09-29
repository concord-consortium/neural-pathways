# views

One folder per lesson view (Trace a Case, Extract Pathways, …). The app lists them in
`src/app/views.ts`.

Within the repo, a view may import only from its own folder and `src/core/`: not from
`src/app/`, `src/lab/`, or another view. Packages such as React are fine. Anything two views
share belongs in `src/core/`. Every line here is reviewed; see
`src/core/README.md`.
