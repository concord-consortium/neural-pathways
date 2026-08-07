# Manually Testing Attribute Commissioning

A walkthrough for the feature that lets some alien-dataset attributes start out
**hidden** — absent from every surface of the explorer — until a student
"commissions" a coder to read the corpus and unlock one. It covers confirming the
hiding is total, commissioning an attribute and watching it appear everywhere at
once, the `#coded=` URL state, Reset, that Yelp is untouched, and whether the
discovery route the dataset was built to support actually works.

Run:

```bash
npm start
```

`start` has a `prestart` hook that regenerates the alien data every time. On the
run used for this document, webpack served the app at `http://localhost:8082`
(it picks the next free port when 8080 is busy — expect a different port number
on your own run, the rest of the URLs below will differ only in the port).

## 1. What is hidden on first load

Open `http://localhost:8082/explorer.html#dataset=alien`. The `Dataset:`
dropdown reads **Alien Conversations (4 pathways)**, the results header reads
**`800 of 800`**, and the top bar shows a button reading **`Codings 4`**
between **Correlations** and **Settings** — that count is the number of
attributes still available to commission.

Click the first result to select a conversation (in this run, item
`c04b9a49822c`). Only **eight** attribute chips appear — `Actual answer`,
`Predicted answer`, `Model was correct`, `Voices raised`, `Engaged in a task`,
`Group size`, `Near water`, `Food present` — four short of the twelve
`docs/testing-alien-explorer.md` §2 accounts for. The four missing are the
hidden codings.

Click **`Codings 4`**. The dialog reads:

> The conversations already carry attributes a coder recorded before this data
> reached you. A coder can read all 800 conversations again and record one more.
> Choose what you think is worth the effort.

Under **AVAILABLE TO COMMISSION** it lists exactly four attributes, each with a
**Commission** button and a description:

| Label | Description |
|---|---|
| Resource stressed | Whether the surroundings showed scarcity rather than abundance. Coded from the state of the area around the group, not from anything the group did. |
| Gestures repeated | Whether any single hand gesture recurred during the exchange. |
| Young present | Whether any juvenile was among the individuals recorded. |
| Carrying a burden | Whether individuals were carrying loads. |

These four — `resource_stressed`, `gestures_repeated`, `young_present`,
`carrying_burden` — are the hidden codings. (The keys themselves aren't shown in
this dialog; they're confirmed in §2.3 and §3 below via the search-help field
list and the URL.)

**Bug to report:** a fifth or sixth entry in the Codings dialog, fewer than
twelve total attributes when everything is commissioned, or chips/dialog text
disagreeing with the table above.

## 2. Confirming hiding is total

This is the section that matters most: the whole premise is that a student who
hasn't commissioned `resource_stressed` cannot see it — not as a chip, not
through search, not in the help text, not in the correlation matrix, not in a
regression. A leak on *any one* of the five surfaces below hands the student the
answer they were supposed to decide whether to pay for, so all five have to be
checked independently. Do this before commissioning anything.

### 2.1 No chip on a selected conversation

With any alien conversation selected, count the chips. There should be exactly
eight, ending at `Food present`. **Bug:** a chip labeled `Resource stressed`,
`Gestures repeated`, `Young present`, or `Carrying a burden` appears anywhere.

### 2.2 The flattened search object doesn't match hidden fields

Clear the search box and type `resource_stressed:1`. The results header reads
**`0 of 800`** — the field isn't recognized, so nothing matches (the same
non-matching behavior `docs/testing-alien-explorer.md` §3 documents for
`observation:`). **Bug:** any nonzero result count.

### 2.3 No row in the search help dialog

Click the **`?`** (Search help) button. Under **Attributes**, exactly eight
entries are listed: `target`, `prediction`, `model_correct`, `voices_raised`,
`engaged_in_task`, `group_size`, `near_water`, `food_present`. **Bug:**
`resource_stressed`, `gestures_repeated`, `young_present`, or `carrying_burden`
appears in this list.

### 2.4 No row or column in the correlation matrix

Clear the search box, click **Correlations**. The header reads **`Correlations
over 800 of 800 conversations`**, and the matrix's rows/columns are exactly:
`Actual answer`, `Predicted answer`, `Model was correct`, `Voices raised`,
`Engaged in a task`, `Group size`, `Near water`, `Food present`, `P0`, `P1`,
`P2`, `P3` — twelve in total. **Bug:** an extra row or column for any of the
four hidden attributes.

### 2.5 No term in the regression panel

Still on Correlations, look at the **"Explained by attributes, for:"** panel
below the matrix (default target `P0`). Its checkbox list and its term table
(`Term` / `β` / `partial r`) only ever list **seven** attributes — the eight
visible ones minus `Predicted answer`, which is deliberately never offered as a
regression predictor on either dataset (see `docs/testing-fields-view.md`'s
Known rough edges for why) — plus whichever pathway is the target. In this run,
target `P0` gave `R² = 0.585`, and the term table's rows were `Actual answer`,
`Voices raised`, `Model was correct`, `Group size`, `Engaged in a task`, `Near
water`, `Food present` — nothing else. **Bug:** a hidden attribute's name
appears as a checkbox or a term-table row for any target. (`Predicted answer`'s
absence here is *not* a bug — it is the one surface that attribute skips.)

## 3. Commissioning

With nothing commissioned, open **`Codings 4`** and click **Commission** next to
**Resource stressed**. The address bar immediately gains `&coded=resource_stressed`,
and all five surfaces update at once:

- **Dialog:** `Resource stressed` moves under a new **COMMISSIONED IN THIS
  SESSION** heading; the button now reads **`Codings 3`**; a **Reset codings**
  button appears below the remaining three.
- **Chip:** selecting the same conversation (`c04b9a49822c`) now shows a ninth
  chip, `Resource stressed: yes`, appended right after `Food present` — its
  declared position.
- **Search:** `resource_stressed:1` now returns **`240 of 800`** (was `0 of 800`
  in §2.2).
- **Search help:** the Attributes list now has a ninth entry, `resource_stressed
  — Resource stressed (0 or 1)`, appended after `food_present`.
- **Correlation matrix:** a ninth row/column, `Resource stressed`, appears in
  the same declared position (right after `Food present`, before `P0`).
  `Model was correct × Resource stressed` reads **-0.28** in the grid; clicking
  the cell shows the full-precision drill-down **`r = -0.285`**.
- **Regression panel:** `Resource stressed` now appears as a term for every
  target. For `P0` it's near the bottom (β = -0.006, partial r = -0.009) — see
  §7 for why it matters far more for `P3`.

Commissioning is one-way and free: there's no cost, no confirmation prompt, and
no way to un-commission a single attribute (see "Known rough edges" below).

Commission the remaining three (`Young present`, `Carrying a burden`, `Gestures
repeated`, in that order in this run) to see the end state: the button label
loses its number entirely, reading plain **`Codings`**, and the **AVAILABLE TO
COMMISSION** section is replaced by the line **"Every available coding has been
commissioned."**

**Bug to report:** an attribute appearing on fewer than all five surfaces after
commissioning it, or in a different position than the rest of that surface's
attributes.

## 4. The URL

`#coded=` is the durable record of what's been commissioned:

- **Appears on commissioning:** confirmed above — `&coded=resource_stressed`
  showed up the instant the button was clicked.
- **Sorted key order, regardless of click order:** commissioning `resource_stressed`
  then `young_present` gave `coded=resource_stressed,young_present`. Commissioning
  `carrying_burden` next gave `coded=carrying_burden,resource_stressed,young_present`
  — `carrying_burden` jumped to the front because keys are always written in
  sorted order, not click order. Commissioning the last one, `gestures_repeated`,
  gave `coded=carrying_burden,gestures_repeated,resource_stressed,young_present`.
- **Survives a reload:** with only `resource_stressed` commissioned and
  `resource_stressed:1` still in the search box, a full browser reload
  (`http://localhost:8082/explorer.html#dataset=alien&item=...&fit=alien-fa-4&q=resource_stressed%3A1&coded=resource_stressed`)
  came back showing `Codings 3` and `240 of 800` results — unchanged.
- **A hand-made preset link a teacher could hand out:** pasting
  `http://localhost:8082/explorer.html#dataset=alien&coded=resource_stressed,young_present`
  straight into the address bar (no clicking through the UI at all) loads the
  alien dataset with those two already commissioned — the button reads `Codings 2`
  on first paint. No login, no local storage — the link alone reproduces the
  state.
- **Unknown keys are ignored, not errors:** pasting
  `http://localhost:8082/explorer.html#dataset=alien&coded=resource_stressed,bogus_key`
  loads cleanly (Chrome DevTools console showed no errors or warnings) and the
  address bar settles to `coded=resource_stressed` — `bogus_key` is silently
  dropped. The same holds on a hashchange without a full navigation: with the
  page already open, running
  `location.hash = '#dataset=alien&coded=young_present,another_bogus'` in the
  console settled to `coded=young_present`, again with no console errors.

**Bug to report:** `coded=` written in click order instead of sorted order, lost
on reload, or an unknown key surviving into the address bar or throwing a
console error.

## 5. Reset, and that commissions clear when the dataset changes

With one or more attributes commissioned, open Codings and click **Reset
codings**. The `coded=` parameter disappears from the address bar entirely (not
`coded=`, just gone), the button reverts to **`Codings 4`**, and the dialog goes
back to showing all four under **AVAILABLE TO COMMISSION** with no
**COMMISSIONED IN THIS SESSION** heading and no Reset button.

Separately: commission `Resource stressed` again, then switch the `Dataset:`
dropdown from **Alien Conversations (4 pathways)** to **Yelp Reviews**. The
whole hash is rewritten — `coded=resource_stressed`, `dataset=alien`, the
selected `item=`, and the search `q=` are all dropped in the same step,
landing on `explorer.html#fit=train-fa-6`. Switching back to
**Alien Conversations (4 pathways)** does not restore the commission — it
comes back with `Codings 4` and nothing commissioned.

**Bug to report:** `coded=` surviving a Reset, or a commissioned attribute still
active (or still in the address bar) after switching datasets away and back.

## 6. Yelp

With Yelp Reviews loaded, there is **no Codings button** at all — the top bar
goes straight from Search help to Explore/Correlations to Settings, nothing in
between.

Open Search help: the **Attributes** list has all six of Yelp's attributes,
unchanged — `review_stars` (Review rating), `stars` (Business rating), `target`
(Actual sentiment), `prediction` (Predicted sentiment), `model_correct` (Model
was correct), `is_synthetic` (Synthetic review). None of Yelp's attributes are
declared hidden, so there's nothing to commission and nothing missing.

Click the first review ("Awesome New York style pizza..."). Its chips read
`Review rating 5`, `Business rating 4.00`, `Actual sentiment yes`, `Synthetic
review no`, alongside the business identity (`Benny Pennello's · Charlotte, NC`,
`Fast Food, Pizza, Italian, Restaurants`) and `Reconstruction R²: 0.8916` — all
exactly as `docs/testing-alien-explorer.md` §5 describes. Four chips, not six:
this review was never scored by the model, so `Predicted sentiment` and `Model
was correct` have no value for it and a chip is not drawn. Pick a review
matching `model_correct:1` to see all six.

An existing search still works unmodified: `stars:5 AND pathway_0:>0.8` returns
**`1731 of 6427`**.

**Bug to report:** a Codings button appearing anywhere in the Yelp view, any of
Yelp's six attributes missing from Search help — or missing as a chip on a
review that actually has a value for it — or the existing search returning
something other than `1731 of 6427`.

## 7. The intended discovery path

This is the route the alien dataset was built to support, and the reason the
whole feature exists: a pathway that correlates with nothing visible, notes that
independently point at scarcity, and a commissioned attribute that ties the two
together and explains the classifier's bias. Walking it for real, without being
told the numbers in advance:

**Find a pathway with nothing visible attached to it.** Before commissioning
anything, clear search and open Correlations. Scan the `P0`–`P3` columns against
`Model was correct`: `P0` is -0.03, `P1` is -0.05, `P2` is 0.00, and `P3` stands
out at **-0.18**. Now read `P3`'s own row against the other *visible*
attributes: `Actual answer` 0.04, `Voices raised` 0.02, `Engaged in a task`
-0.00, `Group size` 0.05, `Near water` -0.02, `Food present` 0.01 — all noise —
and `Predicted answer` at **-0.09**, the largest of them but still weak,
and only half of `P3`'s -0.18 against `Model was correct`. That one is not a
separate lead either: `Model was correct` is by definition whether `Predicted
answer` and `Actual answer` agree (the two correlate 0.19), so a `P3` signal
against the prediction is the same signal read a second way, and it points back
at the model rather than at anything about the conversations. `P3` has a real
(if modest) relationship to whether the model got the answer right, and no
visible explanation for what drives it.

**Read the notes of its highest-scoring conversations.** Search
`pathway_3:>2.5` — 8 of 800 conversations. Their observer's notes, read
independently:

- *"Stores nearby were nearly empty. ... Nothing to eat anywhere in frame. ...
  The ground was dry in every direction."*
- *"I could see no food at all. ... Everything within reach had already been
  stripped."*
- *"The surroundings looked picked over and bare."*

Three for three: scarcity language, not language about voices, tasks, water, or
group size — the attributes already visible.

**Commission `resource_stressed`.** Open Codings, commission it.

**Check whether it correlates with `P3` and with `model_correct`.** Click the
`Resource stressed × P3` cell: drill-down reads **`r = 0.649, n = 800`**, groups
`no` (n = 560, mean -0.42) vs `yes` (n = 240, mean 0.99), **means differ by
1.86σ** — `P3` is essentially the resource-stressed pathway. Click `Model was
correct × Resource stressed`: **`r = -0.285`** — the largest-magnitude
correlation of any attribute against `Model was correct` in the full,
twelve-attribute matrix (bigger than `Actual answer`'s -0.25 and `Predicted
answer`'s 0.19, both of which `Model was correct` is defined in terms of
anyway). As a plain-count
cross-check: `model_correct:0` alone is **`63 of 800`**; `model_correct:0 AND
resource_stressed:1` is **`47 of 800`** — **47/63 ≈ 74.6%** of the model's
errors land on resource-stressed conversations.

**This route works in the current data.** `P3` genuinely correlates with nothing
visible, the notes of its top conversations independently surface scarcity
language before any attribute is commissioned, and commissioning
`resource_stressed` both explains `P3` (r = 0.649) and reproduces the same
model-bias signal `docs/testing-alien-explorer.md` §4 documents for the
already-visible version of this dataset (r = -0.285, ≈74.6% of errors). A
reviewer following the same steps should see the same shape of result, though
the specific note text and item IDs are seeded and may shift on a future
regeneration.

**Bug to report:** if `P3` turned out to correlate with a *visible* attribute
(defeating the "nothing visible" premise), if the top-`P3` notes stopped
containing scarcity language, or if commissioning `resource_stressed` failed to
produce a strong `P3` or `model_correct` correlation.

## 8. What is not here yet

- **Tuning.** The -0.285 bias correlation, the 0.649 `P3` correlation, and every
  other number quoted above come from an untuned generator run — the same
  "starting value, not a chosen strength" caveat `docs/testing-alien-explorer.md`
  §6 makes about the pre-hiding version of this same bias. Phase 7 tunes these
  strengths; expect the exact numbers in this document to change on a future
  regeneration even though the mechanism (chips, search, matrix, regression, URL)
  should not.

---

## Known rough edges — already known, no need to report

- **Commissioning is unlimited.** Nothing stops a student from clicking
  Commission on all four attributes immediately — there's no budget, no cost,
  and no per-attribute way to undo a single commission (only the all-or-nothing
  Reset). Any pacing is expected to come from how a curriculum sequences the
  exercise, not from the app itself.
- **The three decoys show nothing when commissioned.** `Gestures repeated`,
  `Young present`, and `Carrying a burden` are decoys by construction — in this
  run their correlations with `Model was correct` were -0.02, -0.01, and -0.03
  respectively (essentially the same noise floor as the other visible,
  non-planted attributes). Commissioning them correctly produces nothing
  interesting; that's the generator working as designed, not a bug.
- **The alien-language snippets and templated notes** are unrelated,
  pre-existing characteristics of this dataset (see `docs/testing-alien-explorer.md`
  §2–§3, §6) and are unchanged by this phase.
