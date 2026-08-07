# Manually Testing the Alien Explorer

A walkthrough for checking the second dataset — generated "alien conversations" —
that now sits alongside the Yelp reviews. It covers getting to the alien explorer,
reading a conversation, searching, and (the main event) using the Correlations view
to find a bias that was deliberately planted in the data generator: the classifier
is systematically worse on conversations where `resource_stressed` is true.

As in `docs/testing-correlations-view.md`, **`r`** is the correlation between two
things (-1 to 1, 0 meaning no relationship) and **`n`** is how many conversations a
number was computed from.

## 1. Getting there

Run:

```bash
npm start
```

`start` has a `prestart` hook that runs `npm run generate:alien` first, so the alien
data is regenerated every time — now **two** datasets, one after the other. On the
run used for this document, the generator printed:

```
alien dataset — seed 20260803, 800 conversations
output dist/alien-data, fit "alien-fa-4"
```

followed eventually by `wrote 800 conversations to .../dist/alien-data`, then a
second summary opening

```
alien dataset — seed 20260803, 800 conversations
output dist/alien-data-3, fit "alien-fa-3"
```

followed by `wrote 800 conversations to .../dist/alien-data-3`, and then webpack
compiled and served the app at `http://localhost:8080`.

- Open `http://localhost:8080/`. The landing page heading reads **Neural
  Pathways**, with four links: **Heatmap**, **Explorer**, **Alien Explorer (4
  pathways)**, and **Alien Explorer (3 pathways)**. The **Alien Explorer (4
  pathways)** link points at `explorer.html#dataset=alien`; **Alien Explorer (3
  pathways)** points at `explorer.html#dataset=alien3`.
- Click **Alien Explorer (4 pathways)**. The `Dataset:` dropdown reads **Alien
  Conversations (4 pathways)**, the results header reads **`800 of 800`**, and
  the address bar settles on `explorer.html#dataset=alien&fit=alien-fa-4`.
- Load a bare `http://localhost:8080/explorer.html` (no hash) instead. This is
  still Yelp: the dropdown reads **Yelp Reviews** and the results header reads
  **`6427 of 6427`**.
- With the alien dataset open, switch the `Dataset:` dropdown back to **Yelp
  Reviews**. The `#dataset=alien` part disappears from the URL entirely — the
  address became `explorer.html#fit=train-fa-6`, not
  `explorer.html#dataset=yelp&fit=train-fa-6`. Switching the dropdown the other way
  (Yelp → Alien) adds `#dataset=alien` back.

**Bug to report:** a bare `explorer.html` showing alien conversations, or
`#dataset=alien` still present in the address after switching to Yelp Reviews.

## 2. What a conversation looks like

With the alien dataset loaded, the results list shows 800 rows of alien-language
snippets, e.g. `hakku sooma ulash arvek tarrak blikka tisshak ledda mirrek ganneth
nembu arvek h...`. Click the first one.

- A meta row above the text carries three labels: the **ground-truth label** (e.g.
  `approach`), the **prediction badge** — `predicted: wait (31.4%)` in the
  conversation observed here — and a small `alien` source tag. The badge follows the
  `predicted: approach`/`predicted: wait` pattern named in the spec.
- Below that, the conversation text is **turn-separated**, one alien-language line
  per turn (six lines in the example observed).
- An **OBSERVER'S NOTE** block follows, in English, e.g.: *"They were standing at
  the edge of open water. Ground was uneven where they stood. Five of them, no
  clear arrangement. ... No gesture was repeated."*
- Below the note, **eight attribute chips** in a fixed order: `Actual answer`,
  `Predicted answer`, `Model was correct` (the three derived attributes — the
  ground truth, what the model said, and whether they agreed), then five of the
  nine generated attributes — `Voices raised`, `Engaged in a task`, `Group size`,
  `Near water`, `Food present`. The other four generated attributes —
  `Resource stressed`, `Gestures repeated`, `Young present`, `Carrying a
  burden` — start **hidden** as of this phase: no chip, no search field, no
  matrix row or regression term, until a student commissions one from the
  Codings dialog. See `docs/testing-attribute-commissioning.md` for that
  mechanism; §4 below picks `resource_stressed` back up once it's
  commissioned.
- What is **absent**, correctly: there is no `FA Fit:` dropdown next to `Dataset:`
  (the alien dataset declares only one fit, `alien-fa-4`, so there is nothing to
  choose between); no star icons, no business name/location, and no `Reconstruction
  R²:` line — none of that exists in this dataset.
- The **Pathways** panel on the right lists only **Pathway 0 through Pathway 3**
  (`P0`–`P3`), fewer than Yelp's six.

**Bug to report:** a star rating, business name, `Reconstruction R²` line, or a
second FA-fit selector showing up anywhere in the alien view; or the attribute chips
appearing in a different order than `Actual answer`, `Predicted answer`, `Model was
correct`, then the five visible generated attributes; or a hidden attribute's chip
appearing before it has been commissioned.

## 3. Searching

Click the **`?`** (Search help) button next to the search box.

- **Fields**: `text` (Conversation text), `target_label`, `pathway_0` through
  `pathway_3`, `has_word_scores`, `classification_label`,
  `classification_probability`. Unlike Yelp's help dialog (which lists `name`,
  `city`, `state`, `categories`, `reconstruction_r2`), **no business fields appear
  at all** — the alien dataset has none.
- **Attributes**: `target`, `prediction`, `model_correct`, `voices_raised`,
  `engaged_in_task`, `group_size`, `near_water`, `food_present`. Four more attributes —
  `resource_stressed`, `gestures_repeated`, `young_present`, `carrying_burden` —
  exist in the data but start hidden: they don't appear in this list, and
  searching one of their keys matches nothing, until commissioned. See
  `docs/testing-attribute-commissioning.md`.

Try these searches (results header shown from the run used for this document):

| Query | Results |
|---|---|
| `voices_raised:1` | `280 of 800` |
| `group_size:>3` | `336 of 800` |
| `model_correct:0` | `63 of 800` |

**`observation` is deliberately not searchable.** Typing `observation:water`
returns **`0 of 800`** — the field isn't recognized, so nothing matches. This is on
purpose: the generator's own self-check confirms *"all 800 notes attest all 9
attributes exactly once"* — every attribute is attested in the note by a fixed
phrase. If the note text were searchable, that would hand a later phase's exercise
(coding the notes by hand to recover the hidden attributes) to the searcher for
free. For the same reason, the results list never renders the note text — only the
`text` field's alien-language snippet.

**Bug to report:** `observation:` matching anything, or the results list ever
showing observer's-note text instead of the alien-language conversation text.

## 4. Finding the planted bias

This is the point of the alien dataset: the classifier was deliberately made worse
on conversations where `resource_stressed` is true. Here is how to find that by
exploring, without being told the number in advance.

**`resource_stressed` starts hidden as of this phase** (§2, and
`docs/testing-attribute-commissioning.md`), so this section can't be followed from
a bare `#dataset=alien` link. Open
`explorer.html#dataset=alien&coded=resource_stressed` instead — that pre-commissions
just this one attribute, which restores it as a chip, a search field, and a
matrix row/regression term, while leaving the other three hidden attributes
(`gestures_repeated`, `young_present`, `carrying_burden`) hidden.

Clear the search box and click **Correlations**.

- The header reads **`Correlations over 800 of 800 conversations`**.
- Look along the **Model was correct** row. Against the other visible attributes
  it's weak: `Voices raised` 0.04, `Engaged in a task` 0.02, `Group size` 0.03,
  `Near water` -0.04, `Food present` -0.02. (The three still-hidden decoys —
  `Gestures repeated`, `Young present`, `Carrying a burden` — aren't in the
  matrix at all right now; §7 of `docs/testing-attribute-commissioning.md` shows
  them once commissioned, and they read the same kind of near-zero.) Three values
  stand out from that noise floor: `Predicted answer` at **0.19**, `Actual
  answer` at **-0.25**, and — the largest of any attribute — **`Resource
  stressed` at -0.28**. The first two are arithmetic rather than discovery:
  `Model was correct` is *defined* as whether `Predicted answer` and `Actual
  answer` agree, so it cannot be independent of either, and neither tells you
  anything about the conversations themselves. `Resource stressed` is the one
  that does. Against the pathways, `P3` also stands out at **-0.18** while `P0`,
  `P1`, `P2` sit near zero (-0.03, -0.05, 0.00).

Click the **Model was correct × Resource stressed** cell.

- Hovering it first shows the full-precision tooltip: **`Model was correct x
  Resource stressed: r = -0.2846, n = 800`**.
- The drill-down reads **`Model was correct × Resource stressed · r = -0.285 · n =
  800`**, with two histogram rows: `no` (**n = 63, mean 0.75**) and `yes` (**n =
  737, mean 0.26**), and **`Means differ by 1.10σ`** below.

Read that directly: among the 63 conversations the model got wrong (`Model was
correct = no`), the mean of `Resource stressed` is 0.75 — three quarters of the
model's errors are on resource-stressed conversations — versus 0.26 among the 737
it got right.

Now filter the scope. Type `model_correct:0` into the search box.

- The header becomes **`Correlations over 63 of 800 conversations`**.
- The **Model was correct** row and column now read **`—`** everywhere (every
  remaining conversation has the same value, so it has zero variance — the same
  rule documented in `docs/testing-correlations-view.md` §3).
- The still-selected cell's summary line updates to **`Model was correct × Resource
  stressed · r undefined · n = 63`**, with a single remaining histogram row (`no`,
  n = 63, mean 0.75) — consistent with the unfiltered chart above.
- Scroll to the regression panel below (target `P0`): it now reads **`Dropped
  before fitting: Model was correct (constant)`** and **`Fitted on 63 of 63
  rows`**. The term table's top row is **`Resource stressed`** with **β = 0.613,
  partial r = 0.512** — by a wide margin the strongest predictor of `P0` among the
  model's errors. (This regression fits on eight predictors: the nine attributes
  currently visible — the eight default ones plus the just-commissioned
  `resource_stressed` — minus `Predicted answer`, which is never offered as a
  predictor on either dataset, so its missing checkbox is not a bug; see
  `docs/testing-fields-view.md`'s Known rough edges. That is short of the twelve
  attributes the dataset has in total. Commissioning the remaining three decoys
  too adds them as three more terms, each modest (magnitudes 0.02–0.09), and
  settles `Resource stressed` at **β = 0.589, partial r = 0.490** — the number
  this section quoted before hiding existed — without changing which term is on
  top.)

As a cross-check with plain counts rather than the matrix: `model_correct:0 AND
resource_stressed:1` returns **`47 of 800`**. Since `model_correct:0` alone is `63
of 800`, that's **47 / 63 ≈ 74.6%** of the model's errors landing on
resource-stressed conversations — matching the 0.75 mean read off the histogram.

Everything above was walked through with `resource_stressed` **commissioned via
the URL**, as an open shortcut to confirm the bias is really there. The intended
route — finding this same bias starting from nothing visible, by reading the
observer's notes and choosing to commission `resource_stressed` rather than being
handed it in the address bar — is the whole subject of
`docs/testing-attribute-commissioning.md` §7.

**Bug to report:** if `Model was correct × Resource stressed` were near zero, or
some other attribute (not `Resource stressed`) showed the strongest relationship to
`Model was correct`, the planted bias would have failed to land in this run and
should be reported. What was actually observed — r = -0.2846, the largest of any
attribute's correlation with `Model was correct`, and ~74.6% of errors falling on
resource-stressed conversations — matches the intended plant.

## 5. Checking Yelp did not regress

Switch the `Dataset:` dropdown back to **Yelp Reviews**.

- The results header returns to **`6427 of 6427`**.
- The `FA Fit:` dropdown reappears, reading **`train-fa-6`**.
- The search box placeholder reverts to `stars:5 AND pathway_0:>0.8`.
- The address bar drops `dataset=` entirely (it read `explorer.html#fit=train-fa-6`
  in this run) — switching *to* the default dataset removes the parameter just as
  loading a bare URL does.

Click a review (e.g. the first one, "Awesome New York style pizza...").

- **Star ratings are back**: five filled stars, plus `positive`/`train` tags.
- **Business identity is back**: `Benny Pennello's · Charlotte, NC`, categories
  `Fast Food, Pizza, Italian, Restaurants`, and a business-rating star row (4 of 5
  stars).
- **`Reconstruction R²: 0.8916`** is shown.
- Chips read `Review rating 5`, `Business rating 4.00`, `Actual sentiment` (yes),
  `Synthetic review no` — four, not six, because this particular review was never
  scored by the model, so `Predicted sentiment` and `Model was correct` have no
  value for it and no chip is drawn.
- Open Search help again: the business fields (`name`, `city`, `state`,
  `categories`, `reconstruction_r2`) are back, alongside `review_stars`, `stars`,
  `target`, `prediction`, `model_correct`, `is_synthetic`.
- Switch to Correlations: the header reads **`Correlations over 6427 of 6427
  reviews`**, and the default `P0` fit still reports **`R² = 0.873 · 13%
  unexplained`**, matching `docs/testing-correlations-view.md`.

**Bug to report:** any of the above staying missing or wrong after switching back
from the alien dataset — that would mean dataset switching is leaking state between
datasets rather than cleanly resetting it.

## 6. The three-pathway dataset

Open `explorer.html#dataset=alien3&coded=resource_stressed` (as in §4,
`resource_stressed` starts hidden, so this pre-commissions it via the URL). The
`Dataset:` dropdown reads **Alien Conversations (3 pathways)**, and the address
bar settles on `explorer.html#dataset=alien3&fit=alien-fa-3&coded=resource_stressed`.
The results header reads **`800 of 800`**. Open Search help: the **Fields**
section offers `pathway_0 through pathway_2` — one fewer than the four-pathway
dataset's `pathway_0 through pathway_3`.

This dataset's pathway assignments differ from the four-pathway one: `group_size`
is a decoy here (no pathway) instead of P2, and the bias attribute
`resource_stressed` sits on **P2** instead of P3.

Click **Correlations**.

- The header reads **`Correlations over 800 of 800 conversations`**.
- Along the **Model was correct** row, the visible attributes read weak, as in
  §4: `Voices raised` 0.06, `Engaged in a task` 0.06, `Group size` 0.03, `Near
  water` -0.01, `Food present` 0.02. `Predicted answer` (0.22) and `Actual
  answer` (-0.24) are arithmetic, same reasoning as §4. **`Resource stressed`**
  is again the standout at **-0.29** — the largest of any attribute. Against
  the pathways, **`P2`** stands out at **-0.21**, while `P0` (-0.04) and `P1`
  (-0.00) sit near zero — the bias lands on P2 here, not P3.

Click the **Model was correct × Resource stressed** cell.

- Hovering it shows the full-precision tooltip: **`Model was correct x
  Resource stressed: r = -0.2896, n = 800`**.
- The drill-down reads **`Model was correct × Resource stressed · r = -0.290 ·
  n = 800`**, with two histogram rows: `no` (**n = 64, mean 0.75**) and `yes`
  (**n = 736, mean 0.26**), and **`Means differ by 1.11σ`** below.

As a cross-check: `model_correct:0` alone returns **`64 of 800`**, and
`model_correct:0 AND resource_stressed:1` returns **`48 of 800`** — **48 / 64 =
75.0%** of the model's errors landing on resource-stressed conversations,
matching the 0.75 mean read off the histogram (and the captured run's own
self-check line, `share of errors on the group    75.0%`).

With `model_correct:0` still in the search box, scroll to the regression panel
(target `P0`, same default as §4): it reads **`Dropped before fitting: Model
was correct (constant)`**, **`Fitted on 64 of 64 rows`**, and **`R² = 0.515 ·
48% unexplained`**. The term table's top row is **`Resource stressed`** with
**β = 0.720, partial r = 0.644** — again by a wide margin the strongest
predictor, and numerically stronger here than the four-pathway dataset's β =
0.613 / partial r = 0.512 (§4).

**Bug to report:** the same failure modes as §4, on this dataset — a near-zero
`Model was correct × Resource stressed` correlation, some attribute other than
`Resource stressed` showing the strongest relationship to `Model was correct`,
the bias landing on a pathway other than P2, or the dropdown/address/search-help
not reflecting the three-pathway shape described above. What was actually
observed — r = -0.2896, the bias on P2 rather than P3, and 75.0% of errors on
resource-stressed conversations — matches the intended plant.

## 7. What is not here yet

- **Attribute hiding and commissioned coding are covered in
  `docs/testing-attribute-commissioning.md`, not here.** Four attributes,
  including `resource_stressed`, start hidden as of this phase and must be
  commissioned from the Codings dialog before they appear on any surface (§2,
  §4 above); that document walks the full mechanism (all five surfaces, the
  `#coded=` URL state, Reset) and the intended discovery route that reaches
  `resource_stressed` from the observer's notes rather than a hand-typed URL —
  the same notes this document's §3 already establishes are not searchable, on
  purpose, so that route isn't shortcut-able.
- **Tuning.** The generator's own self-check only guarantees a floor, not a final
  value: *"PASS bias-is-detectable corr(model_correct, resource_stressed) =
  -0.2846 (minimum magnitude 0.2). Below it the bias is there but too weak to
  find."* -0.2846 clears that 0.2 minimum comfortably, but it is a starting value
  from an untuned generator run, not a value chosen for a particular strength of
  student experience. A later phase tunes it.
- **No heatmap support.** The alien generator emits conversation-level attributes
  and pathway scores, but no per-neuron activation files. Navigating to
  `heatmap.html#dataset=alien` does not error and does not show alien data either —
  it silently ignores the `dataset` parameter and displays the Yelp heatmap (still
  `FA Fit: train-fa-6`, the same "Awesome New York style pizza" review as always).
- **Template-written notes.** The Observer's Note text is assembled from a fixed
  pool of template sentences per attribute, not freely generated — confirmed by the
  same self-check line quoted in §3 (*"all 800 notes attest all 9 attributes
  exactly once"*).

---

## Known rough edges — already known, no need to report

- **The notes are visibly templated and repetitive across the 800 items.** The same
  handful of sentence patterns recur; this is a side effect of the fixed-phrase
  template approach described in §3 and §7, not a bug.
- **Results-list snippets are alien words**, and therefore much harder to scan than
  Yelp's English review snippets — this is deliberate; the language is invented and
  isn't meant to be skimmed for meaning.
- **The correlation strengths are the generator's untuned starting values**, not
  values chosen for a particular pedagogical strength — see §7. The -0.2846 bias
  correlation and the other matrix values will likely change once phase 7 tunes
  them (both datasets' bias correlations, -0.2846 and -0.2896, are untuned
  starting values in this sense).
