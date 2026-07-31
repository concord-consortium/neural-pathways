# Chart Axes, Categorical Binning, and Bar Hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the correlation drill-down charts readable — give the stacked
histograms a shared x-axis, give the scatter numeric endpoints, bin discrete columns
one bar per distinct value instead of combing them across 20 continuous bins, and let
every bar report its value and count on hover.

**Architecture:** Two pure helpers in a new `axis.ts` handle number formatting and
tick thinning. `compareGroups` gains a discriminated `Bins` union so a categorical
column carries its distinct values and a continuous one carries bin edges;
`DistributionComparison` renders one shared axis row from whichever it receives.
Bar hover uses SVG `<title>` children on transparent full-height hit rects.

**Tech Stack:** TypeScript, React 18, SCSS, Jest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-31-chart-axes-and-binning-design.md`

## Global Constraints

- Lint: `max-len` 120 chars, double quotes in `src/`, semicolons always, 2-space
  indent. Run `npm run lint` before every commit. Warnings are acceptable; errors are
  not.
- Test commands: `npx jest <path>` for one file, `npm test` for all,
  `npm run test:playwright` for end-to-end. Also run `npx tsc --noEmit`.
- No changes to the heatmap app. No changes to the S3 data format or any file on S3 —
  every statistic is computed in the browser on demand.
- Component files kebab-case; CSS classes prefixed `explorer-`.
- SCSS in `src/explorer/components/` uses plain nested CSS with literal colors — no
  variables, no imports.
- Charts are inline SVG. Do not add a charting library or any new dependency.
- **Cardinality decides the bin mode; the `binCount` argument governs numeric mode
  only.** This is a resolution of a gap in the spec, discovered while planning: every
  pre-existing `compareGroups` test fixture has 20 or fewer distinct scores, so
  "cardinality always decides" turns them all categorical — including two that pass
  `binCount: 4` specifically to exercise numeric binning. The production call site
  passes no `binCount`, so only tests are affected. Tests that mean to exercise
  numeric mode must use a fixture with more than 20 distinct values.
- The `MAX_DISTINCT_FOR_GROUPS = 10` row threshold in `correlations-view.tsx` and the
  row routing rule are NOT touched by this plan.

## Existing Code You Are Changing

`src/explorer/utils/statistics.ts` currently exports `mean`, `standardDeviation`,
`isUsable`, `pearson`, `CorrelationResult`, `GroupSummary`, `GroupComparison`,
`compareGroups`, `LinearFit`, `linearFit`, and holds a module-private `binIndex`
helper and `DEFAULT_BIN_COUNT = 20`.

`GroupComparison` today is:

```ts
export interface GroupComparison {
  groups: GroupSummary[];
  /** binEdges.length === counts.length + 1 */
  binEdges: number[];
  /** |meanA - meanB| / pooled SD, or null when it cannot be computed. */
  separationSd: number | null;
}
```

`binEdges` has exactly one production consumer: `distribution-comparison.tsx`, which
uses it only to derive the bar count.

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/explorer/utils/axis.ts` | Pure axis helpers: `formatAxisValue`, `selectTickIndices` |
| `src/explorer/utils/axis.test.ts` | Helper tests |

**Modify:**

| File | Change |
|---|---|
| `src/explorer/utils/statistics.ts` | Add `Bins` union, replace `binEdges` with `bins`, add categorical mode |
| `src/explorer/utils/statistics.test.ts` | Update bin assertions; add categorical/numeric mode tests |
| `src/explorer/components/distribution-comparison.tsx` | Shared axis row, `scoreLabel` prop, hover hit rects |
| `src/explorer/components/distribution-comparison.scss` | Axis styling, hit-rect pointer events, drop the padding hack |
| `src/explorer/components/distribution-comparison.test.tsx` | Update the literal fixture; add axis and hover tests |
| `src/explorer/components/correlations-view.tsx` | Pass `scoreLabel` |
| `src/explorer/components/scatter-plot.tsx` | Min/max endpoints on both axes |
| `src/explorer/components/scatter-plot.scss` | Axis layout |
| `src/explorer/components/scatter-plot.test.tsx` | Endpoint tests |
| `playwright/workspace.test.ts` | End-to-end coverage of the discrete case |

---

### Task 1: Axis helpers

**Files:**
- Create: `src/explorer/utils/axis.ts`
- Test: `src/explorer/utils/axis.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function formatAxisValue(value: number): string`
  - `function selectTickIndices(count: number, maxLabels: number): number[]`

**Why these are separate from `statistics.ts`:** they are presentation helpers, not
math. Both charts need them, and both are worth testing without rendering anything.

**On `selectTickIndices`:** the final index is ALWAYS included, so a worst case can
return `maxLabels + 1` entries. That is deliberate — an axis whose last tick is
missing looks broken.

- [ ] **Step 1: Write the failing test**

Create `src/explorer/utils/axis.test.ts`:

```ts
import { formatAxisValue, selectTickIndices } from "./axis";

describe("formatAxisValue", () => {
  it("keeps a meaningful decimal", () => {
    expect(formatAxisValue(1.5)).toBe("1.5");
  });

  it("drops trailing zeros from a whole number", () => {
    expect(formatAxisValue(3)).toBe("3");
  });

  it("rounds to two decimal places", () => {
    expect(formatAxisValue(0.33333)).toBe("0.33");
  });

  it("formats a negative value", () => {
    expect(formatAxisValue(-1.204)).toBe("-1.2");
  });

  it("renders a negative zero as plain zero", () => {
    expect(formatAxisValue(-0.001)).toBe("0");
  });

  it("leaves a large value intact", () => {
    expect(formatAxisValue(6427)).toBe("6427");
  });
});

describe("selectTickIndices", () => {
  it("returns every index when they all fit", () => {
    expect(selectTickIndices(5, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns every index when the count equals the limit", () => {
    expect(selectTickIndices(10, 10)).toHaveLength(10);
  });

  it("thins the indices when there are too many", () => {
    expect(selectTickIndices(18, 10)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 17]);
  });

  it("always includes the final index", () => {
    const indices = selectTickIndices(20, 10);
    expect(indices[indices.length - 1]).toBe(19);
  });

  it("never exceeds the limit by more than the forced final index", () => {
    for (const count of [11, 15, 20, 37, 100]) {
      expect(selectTickIndices(count, 10).length).toBeLessThanOrEqual(11);
    }
  });

  it("returns ascending indices with no duplicates", () => {
    const indices = selectTickIndices(20, 10);
    expect([...new Set(indices)]).toEqual(indices);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it("returns a single index for one item", () => {
    expect(selectTickIndices(1, 10)).toEqual([0]);
  });

  it("returns nothing for an empty axis", () => {
    expect(selectTickIndices(0, 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/explorer/utils/axis.test.ts`
Expected: FAIL — cannot resolve `./axis`.

- [ ] **Step 3: Write the implementation**

Create `src/explorer/utils/axis.ts`:

```ts
/**
 * Formats a number for an axis tick: at most two decimal places, with trailing
 * zeros removed so a whole number reads as "3" rather than "3.00".
 */
export function formatAxisValue(value: number): string {
  const rounded = Number(value.toFixed(2));
  // Number("-0.00") is -0, whose default string form is "0" — but be explicit,
  // because a tick reading "-0" looks like a bug to a reader.
  if (rounded === 0) return "0";
  return String(rounded);
}

/**
 * Chooses which tick indices to label so the labels do not collide.
 *
 * Every index is returned when they all fit. Above that the indices are thinned
 * by a fixed step, and the FINAL index is always appended — an axis missing its
 * last tick reads as broken — so the result may hold maxLabels + 1 entries.
 */
export function selectTickIndices(count: number, maxLabels: number): number[] {
  if (count <= 0) return [];
  if (count <= maxLabels) {
    return Array.from({ length: count }, (_, i) => i);
  }

  const step = Math.ceil(count / maxLabels);
  const indices: number[] = [];
  for (let i = 0; i < count; i += step) {
    indices.push(i);
  }
  const last = count - 1;
  if (indices[indices.length - 1] !== last) indices.push(last);
  return indices;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/explorer/utils/axis.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
npx tsc --noEmit
git add src/explorer/utils/axis.ts src/explorer/utils/axis.test.ts
git commit -m "NPW-10 feat: add axis formatting and tick-thinning helpers"
```

---

### Task 2: Categorical bin mode in `compareGroups`

**Files:**
- Modify: `src/explorer/utils/statistics.ts`
- Modify: `src/explorer/utils/statistics.test.ts`
- Modify: `src/explorer/components/distribution-comparison.tsx` (minimal — keep it compiling)
- Modify: `src/explorer/components/distribution-comparison.test.tsx` (one literal fixture)

**Interfaces:**
- Consumes: nothing new.
- Produces:

```ts
export type Bins =
  | { mode: "categorical"; values: number[] }
  | { mode: "numeric"; edges: number[] };

export interface GroupComparison {
  groups: GroupSummary[];
  bins: Bins;
  separationSd: number | null;
}

export const MAX_DISTINCT_FOR_BARS = 20;
```

`GroupComparison.binEdges` is REMOVED. In categorical mode
`bins.values.length === counts.length`; in numeric mode
`bins.edges.length === counts.length + 1`.

**Mode selection:** count the distinct usable values among the pooled column values.
At or below `MAX_DISTINCT_FOR_BARS` the mode is categorical; above it, numeric with
`binCount` bins as today.

**Empty input** returns `{ groups: [], bins: { mode: "numeric", edges: [] }, separationSd: null }`.

**Why this task also touches the component:** removing `binEdges` breaks
`distribution-comparison.tsx`, which reads it to derive the bar count. This task
makes that one line compile against the union. The axis and hover come in Task 3.

- [ ] **Step 1: Update the existing statistics tests**

In `src/explorer/utils/statistics.test.ts`, REPLACE the test named
`"shares bin edges across both groups"` with the three tests below, and leave every
other test in the `compareGroups` block exactly as it is:

```ts
  it("shares categorical bin values across both groups", () => {
    // Six distinct scores is well under MAX_DISTINCT_FOR_BARS, so this is categorical.
    const result = compareGroups(groupValues, scores);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2, 3, 7, 8, 9] });
    for (const group of result.groups) {
      expect(group.counts).toHaveLength(6);
    }
  });

  it("shares numeric bin edges across both groups when the column is continuous", () => {
    // 30 distinct values exceeds MAX_DISTINCT_FOR_BARS, so binning is numeric.
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const halves = many.map((_, i) => (i < 15 ? 0 : 1));
    const result = compareGroups(halves, many, 4);
    expect(result.bins.mode).toBe("numeric");
    expect(result.bins).toHaveProperty("edges");
    const edges = (result.bins as { edges: number[] }).edges;
    expect(edges).toHaveLength(5);
    expect(edges[0]).toBeCloseTo(1, 10);
    expect(edges[4]).toBeCloseTo(30, 10);
    for (const group of result.groups) {
      expect(group.counts).toHaveLength(4);
    }
  });

  it("counts every observation exactly once across numeric bins", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const halves = many.map((_, i) => (i < 15 ? 0 : 1));
    const result = compareGroups(halves, many, 4);
    const total = result.groups.reduce(
      (sum, g) => sum + g.counts.reduce((a, b) => a + b, 0), 0,
    );
    expect(total).toBe(30);
  });
```

Then ADD these tests to the end of the same `describe("compareGroups", ...)` block:

```ts
  it("uses one categorical bar per distinct value, ascending", () => {
    const result = compareGroups([0, 0, 1, 1], [2.5, 1, 1, 2.5]);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2.5] });
    expect(result.groups[0].counts).toEqual([1, 1]);
  });

  it("spaces unevenly distributed discrete values evenly", () => {
    // The whole point of categorical mode: 1, 2, 100 get three equal bars rather
    // than two crushed together and one far away with empty bins between.
    const result = compareGroups([0, 0, 0], [1, 2, 100]);
    expect(result.bins).toEqual({ mode: "categorical", values: [1, 2, 100] });
    expect(result.groups[0].counts).toEqual([1, 1, 1]);
  });

  it("stays categorical at exactly the distinct-value limit", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => i);
    const result = compareGroups(twenty.map(() => 0), twenty);
    expect(result.bins.mode).toBe("categorical");
    expect(result.groups[0].counts).toHaveLength(20);
  });

  it("switches to numeric bins one value past the limit", () => {
    const twentyOne = Array.from({ length: 21 }, (_, i) => i);
    const result = compareGroups(twentyOne.map(() => 0), twentyOne);
    expect(result.bins.mode).toBe("numeric");
    expect(result.groups[0].counts).toHaveLength(20);
  });

  it("gives a single distinct score one categorical bar", () => {
    const result = compareGroups([0, 0, 1, 1], [3, 3, 3, 3]);
    expect(result.bins).toEqual({ mode: "categorical", values: [3] });
    expect(result.groups.map(g => g.counts)).toEqual([[2], [2]]);
  });

  it("reports numeric mode with no edges for empty input", () => {
    expect(compareGroups([], []).bins).toEqual({ mode: "numeric", edges: [] });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/explorer/utils/statistics.test.ts`
Expected: FAIL — `result.bins` is undefined; `Bins` is not exported.

- [ ] **Step 3: Implement the bin mode**

In `src/explorer/utils/statistics.ts`, REPLACE the `GroupComparison` interface with:

```ts
/**
 * How a column's values were divided into bars.
 *
 * A discriminated union rather than two optional fields, so a consumer cannot
 * read bin edges from a categorical comparison — the two modes have genuinely
 * different meanings and the type should say so.
 */
export type Bins =
  /** One bar per distinct value, ascending. values.length === counts.length. */
  | { mode: "categorical"; values: number[] }
  /** Equal-width bins. edges.length === counts.length + 1. */
  | { mode: "numeric"; edges: number[] };

export interface GroupComparison {
  groups: GroupSummary[];
  bins: Bins;
  /** |meanA - meanB| / pooled SD, or null when it cannot be computed. */
  separationSd: number | null;
}

/**
 * At or below this many distinct column values, bars are one-per-value rather
 * than equal-width bins. Binning discrete data on a continuous scale leaves
 * empty bins between the occupied ones, and those gaps carry no information.
 *
 * Set to match DEFAULT_BIN_COUNT so categorical mode never renders more bars
 * than numeric mode would have.
 */
export const MAX_DISTINCT_FOR_BARS = 20;
```

Then REPLACE the body of `compareGroups` from the `if (pooled.length === 0)` guard
through the end of the `groups` assignment with:

```ts
  if (pooled.length === 0) {
    return { groups: [], bins: { mode: "numeric", edges: [] }, separationSd: null };
  }

  const distinct = [...new Set(pooled)].sort((a, b) => a - b);
  const categorical = distinct.length <= MAX_DISTINCT_FOR_BARS;

  let bins: Bins;
  let barCount: number;
  let indexOf: (value: number) => number;

  if (categorical) {
    const position = new Map<number, number>();
    distinct.forEach((value, i) => position.set(value, i));
    bins = { mode: "categorical", values: distinct };
    barCount = distinct.length;
    indexOf = value => position.get(value) as number;
  } else {
    const min = distinct[0];
    const max = distinct[distinct.length - 1];
    const edges: number[] = [];
    for (let i = 0; i <= binCount; i++) {
      edges.push(min + ((max - min) * i) / binCount);
    }
    bins = { mode: "numeric", edges };
    barCount = binCount;
    indexOf = value => binIndex(value, min, max, binCount);
  }

  const groups: GroupSummary[] = [...buckets.keys()].sort((a, b) => a - b).map(value => {
    const values = buckets.get(value) as number[];
    const counts = new Array<number>(barCount).fill(0);
    for (const v of values) {
      counts[indexOf(v)]++;
    }
    return {
      value,
      n: values.length,
      mean: mean(values),
      sd: values.length < 2 ? 0 : standardDeviation(values),
      counts,
    };
  });
```

Leave the `separationSd` block below it untouched, and change the final return to
`return { groups, bins, separationSd };`.

Update the `compareGroups` doc comment's second sentence to read:

```
 * Bins are derived once from the pooled scores so the histograms are directly
 * comparable — bar i means the same thing in every group. A column with few
 * distinct values gets one bar per value; a continuous one gets equal-width bins.
```

- [ ] **Step 4: Keep the component compiling**

In `src/explorer/components/distribution-comparison.tsx`, change the destructure and
the bar-count derivation. REPLACE:

```tsx
  const { groups, binEdges, separationSd } = comparison;
  if (groups.length === 0) return null;

  const binCount = binEdges.length - 1;
  const barWidth = binCount > 0 ? 100 / binCount : 100;
```

with:

```tsx
  const { groups, bins, separationSd } = comparison;
  if (groups.length === 0) return null;

  const binCount = bins.mode === "categorical" ? bins.values.length : bins.edges.length - 1;
  const barWidth = binCount > 0 ? 100 / binCount : 100;
```

In `src/explorer/components/distribution-comparison.test.tsx`, the literal
`GroupComparison` in the test named
`"renders a group whose bins are all empty without dividing by zero"` REPLACE:

```tsx
      binEdges: [0, 1, 2],
```

with:

```tsx
      bins: { mode: "numeric", edges: [0, 1, 2] },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/explorer/utils/statistics.test.ts src/explorer/components/distribution-comparison.test.tsx`
Expected: PASS. Every pre-existing behavior test still passes; only the bin-shape
assertions changed.

Then run the full suite — `correlations-view.test.tsx` renders
`DistributionComparison` and must be unaffected:

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
npx tsc --noEmit
git add src/explorer/utils/statistics.ts src/explorer/utils/statistics.test.ts \
        src/explorer/components/distribution-comparison.tsx \
        src/explorer/components/distribution-comparison.test.tsx
git commit -m "NPW-10 feat: bin discrete columns one bar per distinct value"
```

---

### Task 3: Histogram axis and bar hover

**Files:**
- Modify: `src/explorer/components/distribution-comparison.tsx`
- Modify: `src/explorer/components/distribution-comparison.scss`
- Modify: `src/explorer/components/distribution-comparison.test.tsx`
- Modify: `src/explorer/components/correlations-view.tsx`

**Interfaces:**
- Consumes: `Bins`, `GroupComparison` (Task 2); `formatAxisValue`,
  `selectTickIndices` (Task 1).
- Produces: `DistributionComparison` gains a required prop
  `scoreLabel: string` — the name of the column variable.
  `CorrelationsView` passes `selected.col.label`.
  New test ids: `histogram-axis`, `group-bar-hit`.

**Two things to get right:**

1. The axis is HTML, not SVG. The histograms use `preserveAspectRatio="none"`, so
   SVG text inside them would be stretched horizontally along with the bars.
2. `.explorer-group-hit` must set `pointer-events: all`. With `fill: transparent`
   the default `visiblePainted` behavior is inconsistent across engines.

**Existing markup for reference.** `DistributionComparison` currently renders a
`.explorer-group-row` per group (a `80px 1fr 160px` grid of label / svg / stats) and
then, if `separationSd` is not null, a `.explorer-group-separation` div that fakes its
alignment with `padding-left: 90px`. Both the new axis row and that separation line
become real grid rows.

- [ ] **Step 1: Write the failing tests**

In `src/explorer/components/distribution-comparison.test.tsx`, add `scoreLabel` to
EVERY existing `render(<DistributionComparison ... />)` call in the file — the prop is
required, so the file will not type-check without it. Use `scoreLabel="Score"` unless
a test below says otherwise.

Then add this block at the end of the file, inside the outer `describe`:

```tsx
  it("renders one shared axis for the whole stack", () => {
    render(
      <DistributionComparison comparison={comparison} groupLabels={{}} scoreLabel="Score" />,
    );
    expect(screen.getAllByTestId("histogram-axis")).toHaveLength(1);
  });

  it("labels every categorical bar when they all fit", () => {
    // Scores 1,2,3,7,8,9 -> six categorical bars, all labelled.
    render(
      <DistributionComparison comparison={comparison} groupLabels={{}} scoreLabel="Score" />,
    );
    const axis = screen.getByTestId("histogram-axis");
    expect(axis.textContent).toContain("1");
    expect(axis.textContent).toContain("7");
    expect(axis.textContent).toContain("9");
  });

  it("thins the categorical labels when there are too many bars", () => {
    const many = Array.from({ length: 18 }, (_, i) => i + 1);
    const wide = compareGroups(many.map(() => 0), many);
    render(<DistributionComparison comparison={wide} groupLabels={{}} scoreLabel="Score" />);
    const ticks = within(screen.getByTestId("histogram-axis")).getAllByTestId("axis-tick");
    // One cell per bar so the labels stay aligned, but only some carry text.
    expect(ticks).toHaveLength(18);
    const labelled = ticks.filter(tick => tick.textContent !== "");
    expect(labelled.length).toBeLessThanOrEqual(11);
    expect(labelled.length).toBeGreaterThan(1);
  });

  it("labels only the ends in numeric mode", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const continuous = compareGroups(many.map(() => 0), many, 4);
    render(
      <DistributionComparison comparison={continuous} groupLabels={{}} scoreLabel="Score" />,
    );
    const ends = within(screen.getByTestId("histogram-axis")).getAllByTestId("axis-end");
    expect(ends.map(end => end.textContent)).toEqual(["1", "30"]);
    expect(screen.queryAllByTestId("axis-tick")).toHaveLength(0);
  });

  it("gives every bar a hover target naming the value and the count", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{}} scoreLabel="Business stars"
      />,
    );
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits).toHaveLength(6);
    expect(hits[0].textContent).toBe("Business stars 1 — 1 reviews");
  });

  it("keeps a zero-count bar hoverable", () => {
    // Group 0 holds only score 1, so its bar for score 9 is empty — and must still
    // report itself, because "nothing here" is information.
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{}} scoreLabel="Business stars"
      />,
    );
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits[5].textContent).toBe("Business stars 9 — 0 reviews");
  });

  it("names the bin range on hover in numeric mode", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const continuous = compareGroups(many.map(() => 0), many, 4);
    render(<DistributionComparison comparison={continuous} groupLabels={{}} scoreLabel="P0" />);
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits).toHaveLength(4);
    expect(hits[0].textContent).toBe("P0 1 to 8.25 — 8 reviews");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/explorer/components/distribution-comparison.test.tsx`
Expected: FAIL — `histogram-axis` and `group-bar-hit` do not exist; `scoreLabel` is
not a known prop.

- [ ] **Step 3: Write the implementation**

Replace the whole body of `src/explorer/components/distribution-comparison.tsx` with:

```tsx
import React from "react";
import { Bins, GroupComparison } from "../utils/statistics";
import { formatAxisValue, selectTickIndices } from "../utils/axis";
import "./distribution-comparison.scss";

interface DistributionComparisonProps {
  comparison: GroupComparison;
  /** Maps a group's numeric value to a display label, e.g. { 0: "no", 1: "yes" }. */
  groupLabels: Record<number, string>;
  /** Name of the column variable being distributed, used in the hover text. */
  scoreLabel: string;
}

const BAR_AREA_HEIGHT = 48;
const MAX_AXIS_LABELS = 10;

/** Text for a bar's native tooltip: which slice of the column, and how many fell in it. */
function barTitle(bins: Bins, index: number, count: number, scoreLabel: string): string {
  const where = bins.mode === "categorical"
    ? formatAxisValue(bins.values[index])
    : `${formatAxisValue(bins.edges[index])} to ${formatAxisValue(bins.edges[index + 1])}`;
  return `${scoreLabel} ${where} — ${count} reviews`;
}

export const DistributionComparison: React.FC<DistributionComparisonProps> = ({
  comparison, groupLabels, scoreLabel,
}) => {
  const { groups, bins, separationSd } = comparison;
  if (groups.length === 0) return null;

  const binCount = bins.mode === "categorical" ? bins.values.length : bins.edges.length - 1;
  const barWidth = binCount > 0 ? 100 / binCount : 100;
  const tickIndices = bins.mode === "categorical"
    ? new Set(selectTickIndices(bins.values.length, MAX_AXIS_LABELS))
    : new Set<number>();

  return (
    <div className="explorer-distribution-comparison" data-testid="distribution-comparison">
      {groups.map(group => {
        // Each group is scaled against its own peak so the panels compare shape,
        // not raw count. A shared peak would flatten a group that is an order of
        // magnitude smaller than its counterpart into an unreadable line — and
        // that group is usually the interesting one. Each row prints its own n,
        // so the size difference is still on screen.
        const peak = group.counts.reduce((max, count) => (count > max ? count : max), 0);
        return (
          <div className="explorer-group-row" key={group.value} data-testid={`group-row-${group.value}`}>
            <div className="explorer-group-label">
              {groupLabels[group.value] ?? String(group.value)}
            </div>
            <svg
              className="explorer-group-histogram"
              viewBox={`0 0 100 ${BAR_AREA_HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Distribution for group ${groupLabels[group.value] ?? group.value}`}
            >
              {group.counts.map((count, i) => {
                const height = peak === 0 ? 0 : (count / peak) * BAR_AREA_HEIGHT;
                return (
                  <rect
                    key={`bar-${i}`}
                    className="explorer-group-bar"
                    x={i * barWidth}
                    y={BAR_AREA_HEIGHT - height}
                    width={barWidth}
                    height={height}
                    data-testid="group-bar"
                  />
                );
              })}
              {/* Hit targets are painted after the bars so they sit on top, and span
                  the full height so an empty bin is still hoverable. */}
              {group.counts.map((count, i) => (
                <rect
                  key={`hit-${i}`}
                  className="explorer-group-hit"
                  x={i * barWidth}
                  y={0}
                  width={barWidth}
                  height={BAR_AREA_HEIGHT}
                  data-testid="group-bar-hit"
                >
                  <title>{barTitle(bins, i, count, scoreLabel)}</title>
                </rect>
              ))}
            </svg>
            <div className="explorer-group-stats">
              n = {group.n} · mean {group.mean.toFixed(2)}
            </div>
          </div>
        );
      })}

      <div className="explorer-group-row">
        <div />
        <div className="explorer-histogram-axis" data-testid="histogram-axis">
          {bins.mode === "categorical" ? (
            bins.values.map((value, i) => (
              <div className="explorer-axis-tick" key={i} data-testid="axis-tick">
                {tickIndices.has(i) ? formatAxisValue(value) : ""}
              </div>
            ))
          ) : (
            <>
              <div className="explorer-axis-end" data-testid="axis-end">
                {formatAxisValue(bins.edges[0])}
              </div>
              <div className="explorer-axis-end" data-testid="axis-end">
                {formatAxisValue(bins.edges[bins.edges.length - 1])}
              </div>
            </>
          )}
        </div>
        <div />
      </div>

      {separationSd !== null && (
        <div className="explorer-group-row">
          <div />
          <div className="explorer-group-separation">
            Means differ by {separationSd.toFixed(2)}σ
          </div>
          <div />
        </div>
      )}
    </div>
  );
};
```

Replace `src/explorer/components/distribution-comparison.scss` with:

```scss
.explorer-distribution-comparison {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.explorer-group-row {
  display: grid;
  grid-template-columns: 80px 1fr 160px;
  align-items: center;
  gap: 10px;
}

.explorer-group-label {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  text-align: right;
}

.explorer-group-histogram {
  width: 100%;
  height: 48px;
  background: #fafafa;
  border: 1px solid #eee;

  .explorer-group-bar {
    fill: #2c3e80;
  }

  .explorer-group-hit {
    fill: transparent;
    // A transparent fill is not reliably treated as painted, so the default
    // visiblePainted would drop the hover in some engines. Be explicit.
    pointer-events: all;
  }
}

.explorer-group-stats {
  font-size: 12px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.explorer-histogram-axis {
  display: flex;
  font-size: 11px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.explorer-axis-tick {
  flex: 1;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
}

.explorer-axis-end {
  flex: 1;

  &:last-child {
    text-align: right;
  }
}

.explorer-group-separation {
  font-size: 12px;
  color: #333;
}
```

- [ ] **Step 4: Pass the new prop from the container**

In `src/explorer/components/correlations-view.tsx`, find the
`<DistributionComparison ... />` element and add the `scoreLabel` prop so it reads:

```tsx
                  <DistributionComparison
                    comparison={comparison}
                    groupLabels={selected.row.valueLabels ?? {}}
                    scoreLabel={selected.col.label}
                  />
```

Do not change any other prop or any other part of that file.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/explorer/components/distribution-comparison.test.tsx src/explorer/components/correlations-view.test.tsx`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Lint and commit**

```bash
npm run lint
npx tsc --noEmit
git add src/explorer/components/distribution-comparison.tsx \
        src/explorer/components/distribution-comparison.scss \
        src/explorer/components/distribution-comparison.test.tsx \
        src/explorer/components/correlations-view.tsx
git commit -m "NPW-10 feat: add a shared histogram axis and per-bar hover"
```

---

### Task 4: Scatter plot axis endpoints

**Files:**
- Modify: `src/explorer/components/scatter-plot.tsx`
- Modify: `src/explorer/components/scatter-plot.scss`
- Modify: `src/explorer/components/scatter-plot.test.tsx`

**Interfaces:**
- Consumes: `formatAxisValue` (Task 1).
- Produces: no new exports. New test ids: `scatter-x-min`, `scatter-x-max`,
  `scatter-y-min`, `scatter-y-max`. The props are unchanged.

The component already computes `minX`, `maxX`, `minY`, `maxY` for its scales — this
task only renders them.

- [ ] **Step 1: Write the failing test**

Add to `src/explorer/components/scatter-plot.test.tsx`, inside the existing
`describe("ScatterPlot", ...)`:

```tsx
  it("labels the x-axis endpoints", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-x-min").textContent).toBe("1");
    expect(screen.getByTestId("scatter-x-max").textContent).toBe("5");
  });

  it("labels the y-axis endpoints", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-y-min").textContent).toBe("2");
    expect(screen.getByTestId("scatter-y-max").textContent).toBe("6");
  });

  it("formats fractional endpoints without trailing zeros", () => {
    render(<ScatterPlot xs={[1.5, 2.25]} ys={[0, 1]} xLabel="X" yLabel="Y" />);
    expect(screen.getByTestId("scatter-x-min").textContent).toBe("1.5");
    expect(screen.getByTestId("scatter-x-max").textContent).toBe("2.25");
  });
```

The existing fixtures at the top of that file are `xs = [1, 2, 3, 4, 5]` and
`ys = [2, 4, 5, 4, 6]`, which is where the expected `1`, `5`, `2`, `6` come from.

Do not add a test asserting the axis NAMES still render — the file already has
`"renders the axis labels"`, which asserts exactly that and will catch the
restructuring below if it drops them.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/explorer/components/scatter-plot.test.tsx`
Expected: FAIL — no element with test id `scatter-x-min`.

- [ ] **Step 3: Write the implementation**

In `src/explorer/components/scatter-plot.tsx`, add to the imports:

```tsx
import { formatAxisValue } from "../utils/axis";
```

REPLACE the `<div className="explorer-scatter-y-label">{yLabel}</div>` line with:

```tsx
      <div className="explorer-scatter-y-axis">
        <div className="explorer-scatter-axis-end" data-testid="scatter-y-max">
          {formatAxisValue(maxY)}
        </div>
        <div className="explorer-scatter-y-label">{yLabel}</div>
        <div className="explorer-scatter-axis-end" data-testid="scatter-y-min">
          {formatAxisValue(minY)}
        </div>
      </div>
```

REPLACE the `<div className="explorer-scatter-x-label">{xLabel}</div>` line with:

```tsx
      <div className="explorer-scatter-x-axis">
        <div className="explorer-scatter-axis-end" data-testid="scatter-x-min">
          {formatAxisValue(minX)}
        </div>
        <div className="explorer-scatter-x-label">{xLabel}</div>
        <div className="explorer-scatter-axis-end" data-testid="scatter-x-max">
          {formatAxisValue(maxX)}
        </div>
      </div>
```

Replace `src/explorer/components/scatter-plot.scss` with:

```scss
.explorer-scatter-plot {
  display: grid;
  grid-template-columns: 76px 1fr;
  grid-template-rows: 1fr 20px;
  align-items: center;
  gap: 6px;
}

.explorer-scatter-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  height: 220px;
}

.explorer-scatter-y-label {
  font-size: 12px;
  color: #555;
  text-align: right;
}

.explorer-scatter-x-axis {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.explorer-scatter-x-label {
  font-size: 12px;
  color: #555;
  text-align: center;
}

.explorer-scatter-axis-end {
  font-size: 11px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.explorer-scatter-canvas {
  width: 100%;
  height: 220px;
  background: #fafafa;
  border: 1px solid #eee;

  circle {
    fill: rgba(44, 62, 128, 0.35);
  }

  line {
    stroke: #c0392b;
    stroke-width: 0.6;
    vector-effect: non-scaling-stroke;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/explorer/components/scatter-plot.test.tsx`
Expected: PASS, 10 tests (7 pre-existing plus the 3 added above).

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
npx tsc --noEmit
git add src/explorer/components/scatter-plot.tsx \
        src/explorer/components/scatter-plot.scss \
        src/explorer/components/scatter-plot.test.tsx
git commit -m "NPW-10 feat: label the scatter plot axis endpoints"
```

---

### Task 5: End-to-end coverage

**Files:**
- Modify: `playwright/workspace.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-4. No new exports.

**Note:** these run against the live S3 index. `review_stars` has 5 distinct values
and `stars` (Business stars) has roughly 9 half-star values, so **Review stars ×
Business stars** is the case that motivated this work: a discrete row against a
discrete column.

The existing tests in this file navigate with `page.goto("/explorer.html")` and click
matrix cells by `data-testid="cell-<rowKey>-<colKey>"`. Follow that convention.

- [ ] **Step 1: Write the failing test**

Append to `playwright/workspace.test.ts`:

```ts
test("a discrete drill-down shows one labelled bar per value, with no gaps", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-review_stars-stars").click();

  await expect(page.getByTestId("distribution-comparison")).toBeVisible();

  // One shared axis under the whole stack, not one per row.
  await expect(page.getByTestId("histogram-axis")).toHaveCount(1);

  // Business stars are half-star values, so every bar is a real value and none of
  // the bins are the empty spacers that 20 continuous bins used to produce.
  const firstRow = page.getByTestId("group-row-1");
  const bars = firstRow.getByTestId("group-bar-hit");
  const barCount = await bars.count();
  expect(barCount).toBeGreaterThan(1);
  expect(barCount).toBeLessThanOrEqual(20);

  const axisTicks = await page.getByTestId("axis-tick").count();
  expect(axisTicks).toBe(barCount);
});

test("histogram bars report their value and count on hover", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-review_stars-stars").click();

  const firstBar = page.getByTestId("group-row-1").getByTestId("group-bar-hit").first();
  await expect(firstBar.locator("title")).toContainText("Business stars");
  await expect(firstBar.locator("title")).toContainText("reviews");
});

test("a continuous drill-down labels both scatter axes", async ({ page }) => {
  await page.goto("/explorer.html");
  await page.getByRole("button", { name: "Correlations" }).click();
  await page.getByTestId("cell-pathway_1-pathway_0").click();

  await expect(page.getByTestId("scatter-plot")).toBeVisible();
  await expect(page.getByTestId("scatter-x-min")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-x-max")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-y-min")).not.toBeEmpty();
  await expect(page.getByTestId("scatter-y-max")).not.toBeEmpty();
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:playwright`
Expected: PASS, 13 tests total.

If the dev server is already running on a port these tests do not target, or the run
fails immediately with `ERR_ABORTED`, run `CI=1 npm run test:playwright` — the config
starts and targets its own server on port 8080 under `CI`. Do NOT modify
`playwright.config.ts` or any test to work around a server problem.

If `cell-review_stars-stars` is not found, check the rendered test ids against the
Yelp attribute keys (`review_stars`, `stars`, `target`, `model_correct`,
`is_synthetic`) — the cell id is `cell-<rowKey>-<colKey>`. Do not weaken an assertion
to make it pass; if the live data genuinely does not support it, report that with
evidence.

- [ ] **Step 3: Run the full check**

```bash
npm test
npm run lint
npx tsc --noEmit
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add playwright/workspace.test.ts
git commit -m "NPW-10 test: cover chart axes, categorical bins, and bar hover"
```

---

## Done When

- Selecting **Review stars × Business stars** shows evenly spaced bars, one per
  business-star value, with no empty spacer bins between them.
- A single x-axis sits beneath the bottom histogram of the stack, aligned to the bars,
  labelled with each value in categorical mode and with the range ends in numeric mode.
- Hovering any bar — including one whose count is 0 — reports the column name, the
  value or bin range, and the count.
- The scatter plot shows numeric minimum and maximum at both ends of both axes,
  alongside the variable names.
- The `…σ` separation line aligns with the histograms through the grid rather than
  through a hardcoded `padding-left`.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run test:playwright` all
  pass.

## Explicitly Not In This Phase

- The row-side `MAX_DISTINCT_FOR_GROUPS = 10` threshold and the row routing rule are
  unchanged.
- Per-group peak scaling of bar heights is unchanged.
- No count or y-axis labels on the histograms — the per-row `n = …` text carries
  magnitude.
- No gridlines or tick marks beyond the labels themselves.
- No hover on scatter points. With roughly 6,400 points, overlapping marks make it
  arbitrary which one a pointer hits; doing it properly needs nearest-point detection.
- The scatter's points remain slightly elliptical (a consequence of
  `preserveAspectRatio="none"`) and its fit-line endpoints remain unclamped.
- `attribute-chips.tsx` still labels `target` as yes/no rather than
  negative/positive. Tracked separately.
