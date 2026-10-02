# Why mobx-keystone

The lesson views keep their state in [mobx-keystone](https://mobx-keystone.js.org) models (see
[view-state.md](view-state.md)). CODAP and CLUE use MobX-State-Tree (MST) instead, so using
mobx-keystone here is a deliberate trial. This repo is self-contained, its state is small, and the
models are being written now, so it is the cheapest place to find out whether keystone suits us
better than MST. That can't be judged without using it.

The full review, including what we have hit with MST in CLUE and CODAP, is in the Concord
Consortium developer docs (internal):
[Technology Reviews: mobx-keystone](https://github.com/concord-consortium/docs/blob/main/docs/Technology%20Reviews/mobx-keystone.md).

## Why a tree library, not plain MobX

Plain MobX classes with a serialization library such as `serializr`, or hand-written
`toJSON`/`fromJSON`, would be the least setup for what this repo needs today. They give nothing
for free later, though:

- **No runtime type checking** of saved state when it is loaded.
- **No patches or action recording,** so undo and history would be our own code.
- **The schema is declared twice,** once in the classes and once in the serializer, and the two
  can drift apart.
- **`serializr` gets little maintenance.** Its last release was in April 2025.

MST and mobx-keystone both provide snapshots, patches, action recording and runtime types, so the
real choice is between those two.

## What we expect keystone to give us

- **Class models with `this`.** MST actions close over `self`, and inside an `.actions()` block
  `self`'s type includes only the actions from earlier blocks. For one action to call another,
  larger MST models end up split into many blocks, such as nine in CODAP's `DataSet`, and deciding
  what goes in which block is an ongoing cost.
- **Models that implement plain interfaces.** A model class can declare `implements`, so the
  compiler checks that it keeps implementing the interface. Other code can depend on the interface
  instead of the library, and a test can supply its own implementation. The target design's
  `Animated` interface is the example: three view models implement it, and one set of controls can
  drive any of them.
- **Lifecycle hooks that always run.** Children are created when their parent is loaded, and
  `onAttachedToRootStore` runs top-down once the whole tree exists. MST creates children lazily,
  so its hook order depends on what is accessed first.
- **Runtime types.** Every saved field is a `tProp`, not a plain TypeScript type. That gives up one
  of keystone's advertised features on purpose: every load is type-checked, and the URL param
  loader needs each field's type at runtime. Getting runtime types from plain TypeScript would
  need a build step.

## What it costs

- **Familiarity.** The team knows MST. keystone is close to it, and how other developers find it
  is one of the things this trial should tell us.
- **Shared patterns.** Undo, history and serialization helpers from CLUE and CODAP don't carry
  over directly. keystone has built-in equivalents for several of them, and how well our patterns
  transfer is part of the trial.
- **`$modelType` in saved data.** Every model's snapshot carries it, and the names are permanent.
  CLUE and CODAP already store a permanent `type` in each tile's content, so this widens a rule we
  already follow to every model. Saved data that didn't depend on keystone would need a layer that
  adds and strips the field.
- **Loading trusts `$modelType`.** `fromSnapshot(TraceACaseState, json)` can return something
  that isn't a `TraceACaseState`. If `json` is saved Correlations state, for example because an
  author changed an interactive's view after students saved work in it, it returns a
  `CorrelationsState`. That happens with no error, even with type checking on, while TypeScript
  still types it as `TraceACaseState`. So the loader also checks the class with `typeCheck` (see
  [view-state.md](view-state.md)).

## What the trial should tell us

- How developers other than the author find keystone's ergonomics compared with MST's.
- Which CLUE and CODAP patterns carried over, and which had to be rebuilt.
- Whether permanent `$modelType` names caused any trouble in practice.
- Whether `AlwaysOn` type checking had any noticeable cost.

This repo can't answer everything. It has no tiles, no shared models inside a document, no
history, and no references between models, so how keystone handles those in CLUE or CODAP stays
open.

## If we switch away

Switching to MST later would mean rewriting a handful of small models and stripping `$modelType`
from saved student state when it is loaded. The version fields, and the migration pass planned for
when the saved form first changes, don't depend on keystone.
