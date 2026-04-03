# StandardScaler Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable row at the bottom of the heatmap visualization showing raw activations, scaler mean, and scaler scale — each with their own inline color legend.

**Architecture:** A new `showScaler` boolean state in App controls visibility of a new Row 5. The row follows the existing 2-column grid pattern: raw activations in column 1, scaler mean + scaler scale in column 2. Each heatmap computes its own absMax independently from the existing scale mode system.

**Tech Stack:** React, TypeScript, SCSS, Jest + React Testing Library

---

### Task 1: Add "Show Scaler" checkbox and state

**Files:**
- Modify: `src/heatmap/components/app.tsx:37-44` (add state)
- Modify: `src/heatmap/components/app.tsx:156-161` (add checkbox to toolbar)

- [ ] **Step 1: Write the failing test**

Add to `src/heatmap/components/app.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";

it("renders a 'Show Scaler' checkbox that is unchecked by default", () => {
  render(<App/>);
  const checkbox = screen.getByLabelText("Show Scaler");
  expect(checkbox).toBeDefined();
  expect((checkbox as HTMLInputElement).checked).toBe(false);
});
```

Note: the existing import of `render, screen` needs `fireEvent` added — update the import line at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/heatmap/components/app.test.tsx --verbose`
Expected: FAIL — "Unable to find a label with the text of: Show Scaler"

- [ ] **Step 3: Implement the checkbox**

In `src/heatmap/components/app.tsx`, add state alongside the existing `showStats` state (around line 43):

```tsx
const [showScaler, setShowScaler] = useState(false);
```

In the toolbar JSX, after the existing "Show stats" label (around line 156-160), add:

```tsx
<label className="stats-toggle">
  <input type="checkbox" checked={showScaler}
    onChange={e => setShowScaler(e.target.checked)} />
  Show Scaler
</label>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/heatmap/components/app.test.tsx --verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/heatmap/components/app.tsx src/heatmap/components/app.test.tsx
git commit -m "feat(heatmap): add Show Scaler toggle to toolbar"
```

---

### Task 2: Add the scaler row with heatmaps and inline color legends

**Files:**
- Modify: `src/heatmap/components/app.tsx:215-251` (add Row 5 JSX after Row 4)
- Modify: `src/heatmap/components/app.scss:11-17` (add grid row)
- Modify: `src/heatmap/components/app.scss` (add new CSS classes)

- [ ] **Step 1: Write the failing test**

Add to `src/heatmap/components/app.test.tsx`:

```tsx
it("shows raw activations, scaler mean, and scaler scale when Show Scaler is checked", () => {
  render(<App/>);
  // Row should not be visible by default
  expect(screen.queryByText("Raw Activations")).toBeNull();
  expect(screen.queryByText("Scaler Mean")).toBeNull();
  expect(screen.queryByText("Scaler Scale")).toBeNull();

  // Check the toggle
  fireEvent.click(screen.getByLabelText("Show Scaler"));

  // All three labels should now be visible
  expect(screen.getByText("Raw Activations")).toBeDefined();
  expect(screen.getByText("Scaler Mean")).toBeDefined();
  expect(screen.getByText("Scaler Scale")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/heatmap/components/app.test.tsx --verbose`
Expected: FAIL — "Raw Activations" not found after clicking checkbox

- [ ] **Step 3: Update the CSS grid to accommodate Row 5**

In `src/heatmap/components/app.scss`, change the grid-template-rows to add a 6th row:

```scss
.app {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: auto auto auto auto 1fr auto;
  height: 100vh;
  overflow: auto;
}
```

Add new CSS classes at the end of the file:

```scss
.scaler-row-divider {
  grid-column: 1 / -1;
  border-bottom: 1px solid #ccc;
}

.scaler-original {
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.scaler-result {
  padding: 16px;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
}

.scaler-heatmap-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

- [ ] **Step 4: Add the scaler row JSX**

In `src/heatmap/components/app.tsx`, add `computeAbsMax` usage for the three new heatmaps. Add these memos after the existing `activationsAbsMax` memo (around line 108):

```tsx
const rawAbsMax = useMemo(() =>
  computeAbsMax(review.activations_raw),
  [review]
);

const scalerMeanAbsMax = useMemo(() =>
  computeAbsMax(data.scaler.mean),
  []
);

const scalerScaleAbsMax = useMemo(() =>
  computeAbsMax(data.scaler.scale),
  []
);
```

After the closing `</div>` of `comparison-result` (end of Row 4, around line 250), add:

```tsx
{showScaler && <>
  <div className="scaler-row-divider" />
  {/* Row 5, Col 1: Raw Activations */}
  <div className="scaler-original">
    <div className="comparison-section-label">Raw Activations</div>
    <Heatmap
      data={review.activations_raw} absMax={rawAbsMax}
      scaleType={scaleType} valueScaling={valueScaling}
      showStats={showStats}
    />
    <ColorLegend absMax={rawAbsMax} {...colorLegendProps} />
  </div>
  {/* Row 5, Col 2: Scaler Mean + Scaler Scale */}
  <div className="scaler-result">
    <div className="scaler-heatmap-item">
      <div className="comparison-section-label">Scaler Mean</div>
      <Heatmap
        data={data.scaler.mean} absMax={scalerMeanAbsMax}
        scaleType={scaleType} valueScaling={valueScaling}
        showStats={showStats}
      />
      <ColorLegend absMax={scalerMeanAbsMax} {...colorLegendProps} />
    </div>
    <div className="scaler-heatmap-item">
      <div className="comparison-section-label">Scaler Scale</div>
      <Heatmap
        data={data.scaler.scale} absMax={scalerScaleAbsMax}
        scaleType={scaleType} valueScaling={valueScaling}
        showStats={showStats}
      />
      <ColorLegend absMax={scalerScaleAbsMax} {...colorLegendProps} />
    </div>
  </div>
</>}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/heatmap/components/app.test.tsx --verbose`
Expected: PASS

- [ ] **Step 6: Run all tests to make sure nothing is broken**

Run: `npx jest --verbose`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/heatmap/components/app.tsx src/heatmap/components/app.scss src/heatmap/components/app.test.tsx
git commit -m "feat(heatmap): add scaler row with raw activations, mean, and scale heatmaps"
```
