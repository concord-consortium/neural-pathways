# Repository Reorganization — Design

## Overview

Reorganize `src/` so the student-facing lesson code is kept apart from the research tools, and
add a single student app that shows every lesson view, either standalone with a navigation list
or one view at a time embedded in the Activity Player (AP).

Jira: [NPW-22](https://concord-consortium.atlassian.net/browse/NPW-22).

Today everything under `src/` is research-grade: the explorer, the heatmap, and the `shared/`
code both use (and `scripts/` imports). The lesson in
[NPW-13](https://concord-consortium.atlassian.net/browse/NPW-13) needs seven student-facing
views (NPW-23…28), held to a higher bar: **every line of student-facing code is reviewed.** That
only works if the student-facing code lives somewhere it can be reviewed as a unit, grows only
through reviewed story-sized PRs, and cannot quietly depend on unreviewed research code.

After this work:

- `src/lab/` holds the explorer, heatmap and their shared code, unchanged in behavior.
- `src/app/`, `src/views/` and `src/core/` hold student-facing code, with the import boundary
  enforced by lint.
- `index.html` is the student app; the research landing page moves to `lab.html`.
- Each of NPW-23…28 starts by replacing a placeholder view.

## Vocabulary

| Term | Meaning |
|---|---|
| **View** | One unit of the lesson: Trace a Case, Extract Pathways, and so on. The code's name for it. |
| **Interactive** | A view embedded in the AP, via `index.html?interactive=<view-id>`. Reserved for that use. |
| **Standalone app** | `index.html` without the `interactive` param: a left navigation list of views plus the selected view. For students working outside the AP with written instructions. |
| **Lab** | Research, authoring and developer tools (explorer, heatmap). Not student-facing. |

"View" deliberately matches the explorer's `view=` hash param: in both apps a view is a
different way of looking at the same data. "Page" was avoided because AP activities are made of
pages; "production" was avoided because it collides with production/staging deployment.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Folder names | `app/`, `views/`, `core/`, `lab/` | Named for what they hold; no clash with deployment or AP terms. |
| Boundary | Directory boundary enforced by `import/no-restricted-paths` | A real, CI-enforced boundary at the cost of moving folders, without npm workspaces. |
| What moves to `core/` now | **Nothing** | `core/` exists to be fully reviewed. Moving `shared/` in wholesale would hand a reviewer ~1.5k lines at once. Code is promoted as each view needs it. |
| One view per page vs one bundle | **One bundle**; `?interactive=<id>` selects the view | No webpack entry per view. |
| Root URL | `index.html` is the student app; lab landing becomes `lab.html` | Students get the clean URL, and a production release (`index-top.html`) points at the student app. |
| Scope of views | **Placeholders** for all seven | Proves routing, nav, build and deploy; each story replaces its placeholder. |
| LARA interactive API | **Out of scope** | Real work with its own testing needs (a locally running AP); its own story. |
| Delivery | **Two PRs** | PR 1 is pure restructuring the reviewer can skim; PR 2 is new code to review line by line. |

## Target layout

```
src/
  app/            student app: entry, index.html, view registry (views.ts), standalone layout, nav, embed mode
  views/          one folder per view: trace-a-case/, extract-pathways/, …
  core/           reviewed code shared by app and views (empty at first)
  lab/
    explorer/     moved from src/explorer
    heatmap/      moved from src/heatmap
    shared/       moved from src/shared
    index.html    the current landing page
  public/         favicon (build infrastructure, stays)
  test/           jest setup (stays)
scripts/          stays; imports updated to src/lab/…
```

The unused starter-template leftovers are deleted: `src/components/text.tsx`,
`src/hooks/use-sample-text.ts`, `src/utils/translation/` and `src/assets/concord.png`. Nothing
imports any of them.

## Import boundary

Enforced with `import/no-restricted-paths` (eslint-plugin-import is already loaded) at `error`
level, so `npm run lint`, `lint:build` and CI fail on a violation.

The zones are an allow-list: each student-facing area may import only the folders listed below
and packages from `node_modules`. Everything else in the repo is off limits, including `lab/`,
`scripts/` (unreviewed, and it imports `lab/`), `src/test/`, `playwright/`, root files and any new
top-level folder.

| From | May import |
|---|---|
| `src/app/` | `app/`, `views/`, `core/` |
| `src/views/` | `core/`, and its own view folder |
| `src/core/` | `core/` |
| `src/lab/`, `scripts/` | anything |

"Other views" means a view may not import from a sibling view folder. Anything two views share
belongs in `core/`. A single static zone cannot express "siblings", so `eslint.config.mjs`
reads the `src/views/` directory listing and generates one zone per view folder (target: that
folder; from: `src/views/`; except: the folder itself). The registry lives in `app/` because lesson order and navigation are the
app's concern; a view does not know its position in the lesson. A file placed directly in
`src/views/`, outside any view folder, may not import a view.

An `eslint-disable` comment for the rule is itself an error in `app/`, `views/` and `core/`
(`eslint-comments/no-restricted-disable`). `npm run lint:boundary` lints sample imports against
the real config and checks which are flagged, so a refactor that quietly disables a zone fails
the build.

## Review convention

Written into `src/core/README.md`; `src/app/README.md` and `src/views/README.md` point to it:

- Every line under `src/app/`, `src/views/` and `src/core/` is reviewed.
- Code enters these folders only through a story's PR.
- Promoting code from `lab/` is a copy-and-review, rewriting where warranted, not a blind move.
- When a promotion is essentially a move, `lab/` switches to importing the `core/` version and
  the `lab/` copy is deleted. When it is a real rewrite, the `lab/` original may stay until
  nothing in `lab/` needs it.

## PR 1 — Restructure (no behavior change)

Branch: `NPW-22-repo-reorganization`.

**Changes**

- `git mv` `src/explorer`, `src/heatmap`, `src/shared` into `src/lab/`, and `src/index.html` to
  `src/lab/index.html`.
- Update relative imports across `src/lab/` and `scripts/` (`scripts/` imports
  `src/shared/…` and `src/explorer/utils/{statistics,regression,pathway-prediction}`).
- Update webpack entry and template paths. Output filenames (`index.html`, `heatmap.html`,
  `explorer.html`, `index-top.html`) and the `CleanWebpackPlugin` alien-data exclusions are
  unchanged, so `dist/` has the same shape.
- Remove the stale `src/utilities/test-utils.ts` entry from jest's `coveragePathIgnorePatterns`
  (the file does not exist).
- Delete the starter-template leftovers listed above.
- Create `src/app/`, `src/views/` and `src/core/`, each containing only its README.
- Add the import-boundary rule, including the generated per-view zones (which produce no zones
  until PR 2 adds view folders).
- Update living docs that name moved paths: `README.md`, `doc/heatmap-viz.md`,
  `docs/testing-alien-generator.md`, `docs/pathway-prediction-target-analysis.md`. The dated specs and plans
  in `docs/superpowers/` are historical records and stay as written.

**Commits**

The pure `git mv` is its own commit, followed by a separate "update paths" commit, so GitHub
shows the moved files as 100% renames and the reviewer can read the second commit alone.

**Verification**

- No URL changes. The Playwright suite passes unmodified.
- `npm run lint:build`, `npm test`, `npm run build`, `npm run generate:alien` all pass.
- The boundary rule is checked by hand with a temporary violating import in each direction
  (not committed).

## PR 2 — Student app shell

Branch: `NPW-22-student-app`, cut from PR 1's branch.

### View registry

`src/app/views.ts` exports `VIEWS: ViewDef[]`, where
`ViewDef = { id: string; title: string; component: React.ComponentType }`. The array order is
the lesson order and the nav order:

| id | title | story |
|---|---|---|
| `trace-a-case` | Trace a Case | NPW-23 |
| `extract-pathways` | Extract Pathways | NPW-24 |
| `investigate-pathways` | Investigate Pathways | NPW-25 |
| `prediction-chain` | Prediction Chain | NPW-26 |
| `correlations` | Correlations | — (no story yet) |
| `investigate-unknown-pathway` | Investigate Unknown Pathway | NPW-27 |
| `correlations-part-2` | Correlations Part 2 | NPW-28 |

Ids are URL-stable: AP pages will embed them. Renaming one later breaks authored activities.

### Routing

`src/app/index.tsx` renders `App`, which picks a mode from the URL:

- **Embed mode:** `?interactive=<id>` renders that view alone, filling the frame, with no nav.
  The query param is fixed by the AP author and never changed by the app.
- **Standalone mode:** no `interactive` param. A left nav column lists the views in order with
  the current one highlighted; the selected view fills the rest. The selection is kept in the
  hash as `#view=<id>`, so reload and bookmarks keep the student's place (the same hash
  convention the explorer uses). With no hash, or an empty one, the first view is selected.
  Selecting a nav item updates the hash.
- **Unknown id**, in either mode: a short "Unknown view" message that lists the valid ids,
  instead of a blank page. In embed mode this is how an author sees a typo.

The query param selects the *mode* and the hash holds *navigation state*, so an embedded
interactive can never show the nav. The names differ (`interactive` vs `view`) so the two are
not confused by a one-character `?`/`#` difference.

### Placeholder views

One folder per view, e.g. `src/views/trace-a-case/`, with a small component showing the view's
title and "Coming in NPW-23" (or "Coming soon" where there is no story). The folder is where
that story's code goes.

### Styling

Plain SCSS, matching the existing apps. A fixed-width nav column; no design-system decisions.
The NPW-13 UI/UX work will restyle it.

### Webpack and URLs

- Add an `app` entry (`src/app/index.tsx`) with template `src/app/index.html`.
- `index.html` uses the `app` chunk.
- The lab landing page (`src/lab/index.html`) is emitted as `lab.html`.
- `index-top.html` is built from the app template with the `app` chunk, so a production
  release puts the student app at `neural-pathways/`.
- The student app does not link to `lab.html`. `lab.html` gets a link back to the student app.
- CI's `deployRunUrl` (`…/index.html`) is unchanged and now opens the student app on every
  branch deploy.

| URL | Shows |
|---|---|
| `index.html` | Standalone app, first view |
| `index.html#view=<id>` | Standalone app, that view |
| `index.html?interactive=<id>` | That view alone (AP embed) |
| `lab.html` | Research landing page |
| `explorer.html`, `heatmap.html` | Unchanged |

### Tests

Jest:

- Registry: ids are unique, non-empty, URL-safe; order matches the table above.
- Mode selection: embed with a valid id, standalone with and without a hash, unknown id in
  both modes.
- Standalone nav: clicking a nav item shows that view and updates the hash; a `hashchange`
  (back/forward) updates the selection.

Playwright:

- `/` shows the standalone app with seven nav items and the first view selected.
- `/#view=correlations` selects Correlations.
- `/?interactive=correlations` shows Correlations with no nav.
- `/lab.html` shows the research links. This replaces the current landing-page test.

### Docs

- `README.md`: a "URLs" section with the table above and the list of view ids.
- `doc/deploy.md`: note that `index-top.html` is now the student app.
- `src/app/README.md`: fill in the vocabulary, the modes, and "how to add a view".

## Out of scope

Candidates for follow-up stories:

- LARA interactive API integration (height reporting, interactive state, supported features).
  [NPW-14](https://concord-consortium.atlassian.net/browse/NPW-14) targets the explorer today;
  it likely gets retargeted to the student app's embed mode.
- Coverage thresholds or stricter lint for `app/`, `views/` and `core/`.
- The real views (NPW-23…28).
- Moving `scripts/` under the lab, or giving it its own boundary.

## Risks

- **PR 1** changes no URLs; the main risk is a missed import path, which the type check, lint,
  jest, webpack build and Playwright all catch.
- **PR 2** changes what `/` shows. Anyone with a bookmark to the old landing page gets the
  student app. The lab tools are not released to the top level, so there is no top-level
  `lab.html`; in a branch or version folder, `explorer.html` and `heatmap.html` keep working and
  the old landing page's links are one click away at `lab.html`.
- Open PRs or local branches that touch `src/explorer`, `src/heatmap` or `src/shared` will
  conflict with PR 1. Git's rename detection handles most of it on rebase, but it is worth
  merging PR 1 at a quiet moment.
