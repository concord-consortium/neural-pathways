# Attribute Visibility and Commissioned Coding — Design (Phase 6)

## Overview

An attribute marked `hidden` disappears from the explorer entirely. A student who wants it
commissions a fictional coder to read the 800 field notes and record it, and the pre-authored
attribute joins every view.

This models the real constraint in qualitative research: coding costs effort, so you must
choose what to look for before you know whether it will pay off.

The `hidden` flag has been in the data since phase 4 and read by nothing. This phase is the
first to honour it. It authors no new data and changes no dataset's contents.

See [2026-07-30-attributes-and-alien-dataset-overview.md](2026-07-30-attributes-and-alien-dataset-overview.md)
for the surrounding project, and
[2026-08-03-alien-dataset-in-the-app-design.md](2026-08-03-alien-dataset-in-the-app-design.md)
for the dataset machinery this builds on.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Commissioning limit | **None.** Any hidden coding can be commissioned at any time. | **Supersedes the overview's open question**, which proposed a budget. The constraint that makes the choice weighty comes from the curriculum — a teacher requiring a written prediction before the click — not from the app. Building a budget would make the app enforce a pedagogy it cannot see. |
| Where it lives | A **Codings** button in the top bar opening a dialog | Reachable from both Explore and Correlations. The moment a student decides to commission is usually while staring at a pathway that correlates with nothing, or while reading a note — those are different views. |
| Reversibility | **One-way, with a single Reset** | You cannot un-know a coding. Per-attribute un-commissioning is a strange affordance; Reset is what a classroom actually needs. |
| State | **The URL hash**, `#coded=a,b` | Matches every other piece of view state, survives reload, and lets a teacher hand out a link with codings already commissioned — teacher control for free. |
| Yelp | **Declares nothing hidden** | The machinery is dataset-agnostic and tested, but hiding a Yelp attribute would break existing searches and shared links for no teaching benefit. The commissioning fiction needs observer's notes, which Yelp has none of. |
| Dialog contents | **Only hidden and commissioned attributes** | Listing `target` and `model_correct` as "codings" would be false — they are outcomes, not observations — and separating them would need a new flag on `AttributeDefinition` for no gain. |

## Visibility

### Making the leak the hard path

The overview's requirement is that hiding be total. Five surfaces show attributes, and all
five already read one list:

| Surface | Reads |
|---|---|
| Attribute chips | `ItemPanel` → `AttributeChips`, from `dataset.attributes` |
| Search fields | `flattenItem` writes one key per attribute into the object liqe filters |
| Search help dialog | `SearchInput`'s `attributes` prop |
| Correlation matrix | `buildSeries` |
| Regression panel | the same series `buildSeries` produced |

A student who cannot see `voices_raised` as a chip but can still type `voices_raised:1` has
been handed the answer, so the fix must be structural rather than five separate edits.

`ActiveDataset.attributes` therefore comes to mean **visible**, and the full list has to be
asked for by name:

```ts
export interface ActiveDataset {
  config: DatasetConfig;
  /** Attributes the student can currently see. Everything in the UI reads this. */
  attributes: AttributeDefinition[];
  /** Every attribute, uncommissioned ones included. Only the codings dialog reads this. */
  allAttributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
}
```

Every existing consumer becomes correct without being edited, and leaking a hidden attribute
requires typing `allAttributes` deliberately.

An attribute is visible when `attribute.hidden !== true || commissioned.has(attribute.key)`.

### Splitting resolution from filtering

Phase 5 put `activateDataset` inside the index-fetch effect on purpose: `resolveAttributes`
validates a list that, for a generated dataset, arrived over the network, so it can throw, and
doing it there routes a bad index to `loadError` instead of throwing during render.

The commissioned set changes on every click, so filtering cannot live in that effect. The two
concerns split:

```ts
/** Everything the index declares. Built once per load. May throw. */
export interface LoadedDataset {
  config: DatasetConfig;
  allAttributes: AttributeDefinition[];
  getAttributeValue: (item: S3Item, key: string) => number | null;
}

export function activateDataset(config: DatasetConfig, index: S3Index): LoadedDataset;

/** What the student can currently see. Pure, cannot throw, rebuilt on every commission. */
export function applyCommissions(
  loaded: LoadedDataset,
  commissioned: ReadonlySet<string>,
): ActiveDataset;
```

`activateDataset` keeps its place in the fetch effect and its current error behaviour.
`applyCommissions` is a `useMemo` over `[loaded, commissioned]`.

### `getAttributeValue` is not gated

It still answers for a hidden key if asked. The gate is the iteration: every surface walks
`dataset.attributes` rather than querying by arbitrary key, so nothing can reach a hidden
value without first having its definition. Gating the getter as well would add a second
enforcement point that could drift from the first, and would break the dialog if it ever
needed to describe an attribute it has not revealed.

The pinning test below is what holds this in place.

## The Codings Dialog

### The button

Sits in the top bar beside the view toggle, labelled **Codings**, carrying the count of
attributes still available to commission. **It renders only when the dataset has at least one
hidden attribute**, so it never appears on Yelp. The count disappears when nothing is left to
commission, but the button remains, because Reset lives inside it.

Open/close follows the existing pattern in `search-input.tsx`'s help dialog — a ref, an
outside-click listener, and Escape to close.

### Contents

A short framing line establishing the fiction, then two groups:

- **Commissioned in this session** — starts empty; entries move here on commission, showing
  their label only.
- **Available to commission** — label, full `description`, and a Commission button each.

The description is what makes the choice reasoned rather than random. A student who has been
reading notes that mention scarcity recognises "Resource stressed" when they see it in the
list. That recognition is the intended path: the notes carry evidence for every attribute,
hidden ones included, so a hypothesis can be formed before anything is unlocked.

A **Reset** control clears the commissioned set, which also drops `#coded=` from the URL.

Always-visible attributes are not listed. The framing line covers them: the attributes already
on screen were coded before the data reached you.

### What happens on commission

The attribute joins `dataset.attributes` and therefore appears, in the same render, as a chip,
a search field, a help-dialog row, a matrix row and column, and a regression term. The dialog
stays open with the entry moved to the commissioned group, so the state change is visible. The
app does not navigate anywhere or highlight anything — the student was already looking at
whatever prompted the decision.

## URL State

`#coded=resource_stressed,young_present`, joining the existing `dataset`, `fit`, `item`, `q`,
and `view` params. Omitted entirely when the set is empty. **Keys are written in sorted
order**, so the same commissioned set always produces the same URL and two students' links can
be compared by eye.

Read on load and on `hashchange`, like every other param. **Unknown keys are ignored**, and so
are keys naming an attribute that is not hidden — a stale or hand-edited link degrades to
showing something rather than erroring.

**Switching datasets clears the set** and drops the param, because commissioned keys name
attributes of one dataset and mean nothing in another.

## Scope

This phase authors no data. The alien dataset's four hidden attributes are exactly what phase
4's config already produces:

| Key | Role |
|---|---|
| `resource_stressed` | the planted bias — the one that pays off |
| `gestures_repeated` | decoy |
| `young_present` | decoy |
| `carrying_burden` | decoy |

Four candidates and one payoff is the designed situation. The student is not guessing: a
pathway that correlates with nothing visible sends them to read the notes of its
highest-scoring conversations, and scarcity language is what they find there.

Yelp is untouched. No attribute of its five is hidden, its Codings button never renders, and
every existing Yelp search and shared link keeps working.

## Testing

Beyond the ordinary unit coverage of `applyCommissions`, the dialog, and the URL round-trip,
one test carries the requirement:

**A hidden attribute reaches no surface.** In the shape of the existing test pinning that the
observation note never reaches search or the results list, assert for an uncommissioned
attribute that its key is absent from the flattened search object, from `buildSeries` output,
from the help dialog's rendered rows, and from the rendered chips — and that all four contain
it once commissioned. A future consumer that reaches for `allAttributes` then fails loudly.

Worth one Playwright test end to end: open the alien explorer, confirm `resource_stressed:1`
matches nothing and no chip for it exists, commission it from the dialog, and confirm the same
query now matches and the matrix has gained a row.

## Amendment to the Overview

The overview's "Attribute visibility and commissioned coding" section ends with:

> **Open question for that phase:** whether commissioning has a cost (unlock 3 of 8) or is
> teacher-controlled. Without some constraint, students unlock everything immediately and the
> decision carries no weight.

That is now decided and must be replaced when this design is accepted, or the two documents
contradict each other. The replacement records that commissioning is unlimited, that the
constraint is expected to come from the curriculum rather than the app, and that URL state
gives a teacher the option to preset the commissioned set.

## Walkthrough

Per the standing requirement, this phase ships `docs/testing-attribute-commissioning.md` — a
new document rather than a section in `docs/testing-alien-explorer.md`, because verifying that
hiding is total is a five-surface checklist that needs room, and that document is already long.

It covers: what is hidden on first load and how to confirm it across all five surfaces; how to
commission and what changes; the URL round-trip and a preset link; Reset; that switching to
Yelp shows no button and behaves as before; and the intended discovery path from an
uncorrelated pathway through the notes to `resource_stressed`.

## Out of Scope

- Any commissioning budget, cost model, or teacher dashboard.
- Per-attribute un-commissioning.
- Persistence outside the URL — no `localStorage`, no backend.
- Changes to the generator, to the alien config's hidden set, or to any data.
- Hidden attributes on the Yelp dataset.
- Tuning correlation strengths. Phase 7.
