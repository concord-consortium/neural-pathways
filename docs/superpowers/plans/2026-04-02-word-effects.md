# Word Effects Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-word pathway score highlighting to the explorer app so users can see which words drive each pathway's activation.

**Architecture:** Switch data source to `explorer_data_with_words.json` (1,842 reviews with SHAP word scores). Make pathway bars clickable toggles. Show colored word spans below the ReviewPanel for each selected pathway. Color utility maps scores to blue-white-red via inline rgba background-color.

**Tech Stack:** React, TypeScript, SCSS (no new dependencies)

---

### Task 1: Update Types for New Data Format

**Files:**
- Modify: `src/explorer/types/explorer-data.ts`

- [ ] **Step 1: Update ExplorerReview interface**

Add the new fields and remove `exemplars` from `ExplorerData`:

```typescript
export interface WordEffect {
  word: string;
  scores: number[];
}

export interface ExplorerReview {
  index: number;
  source: string;
  text: string;
  target: number;
  target_label: string;
  pathway_scores: number[];
  reconstruction_r2: number;
  pathway_variance_fractions: number[];
  name: string;
  city: string;
  state: string;
  stars: number;
  review_stars: number;
  categories: string;
  rating: string;
  words: WordEffect[];
  base_values: number[];
  unmasked_values: number[];
}

export interface ExplorerData {
  metadata: {
    n_neurons: number;
    n_pathways: number;
    explained_variance_total: number;
    explained_variance_per_pathway: number[];
    n_reviews: number;
    word_effect_metric: Record<string, unknown>;
    data_sources: Record<string, unknown>;
  };
  reviews: ExplorerReview[];
}

export type ScaleMode = "shared" | "per-pathway";

export interface ScaleExtents {
  shared: [number, number];
  perPathway: [number, number][];
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: No errors (the JSON import will now have extra fields that TypeScript accepts since they're a superset).

- [ ] **Step 3: Commit**

```bash
git add src/explorer/types/explorer-data.ts
git commit -m "NPW-1 feat(explorer): update types for word effects data format"
```

---

### Task 2: Switch Data Source

**Files:**
- Modify: `src/explorer/components/app.tsx`

- [ ] **Step 1: Update the import**

In `app.tsx`, change the data import:

```typescript
// old:
import explorerData from "../explorer_data.json";
// new:
import explorerData from "../explorer_data_with_words.json";
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `npx jest --verbose`
Expected: All existing tests pass. The new data has the same shape for the fields that existing components use, plus additional fields.

- [ ] **Step 3: Commit**

```bash
git add src/explorer/components/app.tsx
git commit -m "NPW-1 feat(explorer): switch to explorer_data_with_words.json data source"
```

---

### Task 3: Create scoreToColor Utility

**Files:**
- Create: `src/explorer/utils/score-to-color.ts`
- Create: `src/explorer/utils/score-to-color.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/explorer/utils/score-to-color.test.ts
import { scoreToColor } from "./score-to-color";

describe("scoreToColor", () => {
  it("returns red with alpha for positive scores", () => {
    const color = scoreToColor(0.5, 1.0);
    expect(color).toBe("rgba(231, 76, 60, 0.50)");
  });

  it("returns blue with alpha for negative scores", () => {
    const color = scoreToColor(-0.3, 1.0);
    expect(color).toBe("rgba(52, 152, 219, 0.30)");
  });

  it("returns transparent for zero score", () => {
    const color = scoreToColor(0, 1.0);
    expect(color).toBe("transparent");
  });

  it("clamps alpha to 1.0 when score exceeds maxAbsScore", () => {
    const color = scoreToColor(2.0, 1.0);
    expect(color).toBe("rgba(231, 76, 60, 1.00)");
  });

  it("returns transparent when maxAbsScore is zero", () => {
    const color = scoreToColor(0.5, 0);
    expect(color).toBe("transparent");
  });

  it("handles full negative magnitude", () => {
    const color = scoreToColor(-1.0, 1.0);
    expect(color).toBe("rgba(52, 152, 219, 1.00)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/explorer/utils/score-to-color.test.ts --verbose`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/explorer/utils/score-to-color.ts
export function scoreToColor(score: number, maxAbsScore: number): string {
  if (score === 0 || maxAbsScore === 0) return "transparent";

  const alpha = Math.min(Math.abs(score) / maxAbsScore, 1.0);

  if (score > 0) {
    return `rgba(231, 76, 60, ${alpha.toFixed(2)})`;
  } else {
    return `rgba(52, 152, 219, ${alpha.toFixed(2)})`;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/explorer/utils/score-to-color.test.ts --verbose`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/explorer/utils/score-to-color.ts src/explorer/utils/score-to-color.test.ts
git commit -m "NPW-1 feat(explorer): add scoreToColor utility for word effect coloring"
```

---

### Task 4: Create WordEffectDisplay Component

**Files:**
- Create: `src/explorer/components/word-effect-display.tsx`
- Create: `src/explorer/components/word-effect-display.scss`
- Create: `src/explorer/components/word-effect-display.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/explorer/components/word-effect-display.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { WordEffectDisplay } from "./word-effect-display";

const mockWords = [
  { word: "[CLS]", scores: [0.1, -0.2] },
  { word: "great", scores: [0.5, -0.3] },
  { word: "food", scores: [-0.2, 0.4] },
  { word: "[SEP]", scores: [0.05, -0.1] },
];

describe("WordEffectDisplay", () => {
  it("renders the pathway label", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });

  it("renders word spans with background colors", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    const greatSpan = screen.getByText("great");
    // Positive score -> red background
    expect(greatSpan.style.backgroundColor).toContain("231");
    const foodSpan = screen.getByText("food");
    // Negative score -> blue background
    expect(foodSpan.style.backgroundColor).toContain("52");
  });

  it("filters out [CLS] and [SEP] tokens", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    expect(screen.queryByText("[CLS]")).toBeNull();
    expect(screen.queryByText("[SEP]")).toBeNull();
  });

  it("handles empty words array", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={[]} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/explorer/components/word-effect-display.test.tsx --verbose`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```typescript
// src/explorer/components/word-effect-display.tsx
import React, { useMemo } from "react";
import { WordEffect } from "../types/explorer-data";
import { scoreToColor } from "../utils/score-to-color";
import "./word-effect-display.scss";

interface WordEffectDisplayProps {
  pathwayIndex: number;
  words: WordEffect[];
}

const FILTERED_TOKENS = new Set(["[CLS]", "[SEP]"]);

export const WordEffectDisplay: React.FC<WordEffectDisplayProps> = ({
  pathwayIndex, words
}) => {
  const filteredWords = useMemo(
    () => words.filter(w => !FILTERED_TOKENS.has(w.word)),
    [words]
  );

  const maxAbsScore = useMemo(() => {
    let max = 0;
    for (const w of filteredWords) {
      const abs = Math.abs(w.scores[pathwayIndex]);
      if (abs > max) max = abs;
    }
    return max;
  }, [filteredWords, pathwayIndex]);

  return (
    <div className="word-effect-display">
      <div className="word-effect-header">Pathway {pathwayIndex}</div>
      <div className="word-effect-text">
        {filteredWords.map((w, i) => (
          <span
            key={i}
            className="word-effect-word"
            style={{ backgroundColor: scoreToColor(w.scores[pathwayIndex], maxAbsScore) }}
          >
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Write the styles**

```scss
// src/explorer/components/word-effect-display.scss
.word-effect-display {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.word-effect-header {
  font-size: 12px;
  font-weight: 600;
  color: #444;
  padding-bottom: 4px;
  margin-bottom: 8px;
  border-bottom: 2px solid #5b9bd5;
}

.word-effect-text {
  font-size: 14px;
  line-height: 2;
  color: #333;
}

.word-effect-word {
  padding: 2px 1px;
  border-radius: 2px;

  & + & {
    margin-left: 4px;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/explorer/components/word-effect-display.test.tsx --verbose`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/explorer/components/word-effect-display.tsx src/explorer/components/word-effect-display.scss src/explorer/components/word-effect-display.test.tsx
git commit -m "NPW-1 feat(explorer): add WordEffectDisplay component"
```

---

### Task 5: Create WordEffectsPanel Component

**Files:**
- Create: `src/explorer/components/word-effects-panel.tsx`
- Create: `src/explorer/components/word-effects-panel.scss`
- Create: `src/explorer/components/word-effects-panel.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/explorer/components/word-effects-panel.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { WordEffectsPanel } from "./word-effects-panel";
import { WordEffect } from "../types/explorer-data";

const mockWords: WordEffect[] = [
  { word: "great", scores: [0.5, -0.3, 0.1] },
  { word: "food", scores: [-0.2, 0.4, -0.5] },
];

describe("WordEffectsPanel", () => {
  it("renders one block per selected pathway", () => {
    const selected = new Set([0, 2]);
    render(<WordEffectsPanel words={mockWords} selectedPathways={selected} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
    expect(screen.getByText("Pathway 2")).toBeDefined();
    expect(screen.queryByText("Pathway 1")).toBeNull();
  });

  it("renders nothing when no pathways are selected", () => {
    const selected = new Set<number>();
    const { container } = render(
      <WordEffectsPanel words={mockWords} selectedPathways={selected} />
    );
    expect(container.querySelector(".word-effects-panel")).toBeNull();
  });

  it("renders pathways in ascending index order", () => {
    const selected = new Set([2, 0]);
    render(<WordEffectsPanel words={mockWords} selectedPathways={selected} />);
    const headers = screen.getAllByText(/^Pathway \d+$/);
    expect(headers[0].textContent).toBe("Pathway 0");
    expect(headers[1].textContent).toBe("Pathway 2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/explorer/components/word-effects-panel.test.tsx --verbose`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

```typescript
// src/explorer/components/word-effects-panel.tsx
import React from "react";
import { WordEffect } from "../types/explorer-data";
import { WordEffectDisplay } from "./word-effect-display";
import "./word-effects-panel.scss";

interface WordEffectsPanelProps {
  words: WordEffect[];
  selectedPathways: Set<number>;
}

export const WordEffectsPanel: React.FC<WordEffectsPanelProps> = ({
  words, selectedPathways
}) => {
  if (selectedPathways.size === 0) return null;

  const sortedIndices = Array.from(selectedPathways).sort((a, b) => a - b);

  return (
    <div className="word-effects-panel">
      {sortedIndices.map(i => (
        <WordEffectDisplay key={i} pathwayIndex={i} words={words} />
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Write the styles**

```scss
// src/explorer/components/word-effects-panel.scss
.word-effects-panel {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/explorer/components/word-effects-panel.test.tsx --verbose`
Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/explorer/components/word-effects-panel.tsx src/explorer/components/word-effects-panel.scss src/explorer/components/word-effects-panel.test.tsx
git commit -m "NPW-1 feat(explorer): add WordEffectsPanel component"
```

---

### Task 6: Make Pathway Bars Clickable

**Files:**
- Modify: `src/explorer/components/pathway-bar.tsx`
- Modify: `src/explorer/components/pathway-bar.scss`
- Modify: `src/explorer/components/pathway-bar.test.tsx`
- Modify: `src/explorer/components/pathway-panel.tsx`
- Modify: `src/explorer/components/pathway-panel.test.tsx`

- [ ] **Step 1: Add tests for PathwayBar click and selected state**

Append these tests to the existing `describe` block in `pathway-bar.test.tsx`:

```typescript
import { fireEvent } from "@testing-library/react";

// ... existing tests ...

it("calls onClick with the pathway index when clicked", () => {
  const onClick = jest.fn();
  render(
    <PathwayBar
      index={3}
      score={0.5}
      scaleExtent={[-3, 3]}
      showScore={false}
      showExtents={false}
      onClick={onClick}
    />
  );
  fireEvent.click(screen.getByText("Pathway 3").closest(".pathway-bar-row")!);
  expect(onClick).toHaveBeenCalledWith(3);
});

it("applies selected styling when selected", () => {
  render(
    <PathwayBar
      index={0}
      score={0.5}
      scaleExtent={[-3, 3]}
      showScore={false}
      showExtents={false}
      selected={true}
    />
  );
  const row = screen.getByText("Pathway 0").closest(".pathway-bar-row")!;
  expect(row.classList.contains("pathway-bar-selected")).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest src/explorer/components/pathway-bar.test.tsx --verbose`
Expected: The 2 new tests FAIL (no `selected` class applied, onClick not wired).

- [ ] **Step 3: Update PathwayBar component**

In `src/explorer/components/pathway-bar.tsx`, add `onClick` and `selected` props:

```typescript
interface PathwayBarProps {
  index: number;
  score: number;
  scaleExtent: [number, number];
  varianceFraction?: number;
  showScore: boolean;
  showExtents: boolean;
  onClick?: (index: number) => void;
  selected?: boolean;
}
```

Update the component to use them — change the outer div's className and add an onClick handler:

```tsx
<div
  className={`pathway-bar-row${selected ? " pathway-bar-selected" : ""}`}
  onClick={() => onClick?.(index)}
>
```

- [ ] **Step 4: Add selected styles to pathway-bar.scss**

Append to `src/explorer/components/pathway-bar.scss`:

```scss
.pathway-bar-selected {
  border-color: #5b9bd5;
  background: #f0f6ff;

  &:hover {
    border-color: #5b9bd5;
  }
}
```

- [ ] **Step 5: Run PathwayBar tests**

Run: `npx jest src/explorer/components/pathway-bar.test.tsx --verbose`
Expected: All 8 tests PASS.

- [ ] **Step 6: Add test for PathwayPanel click propagation**

Append to the existing `describe` block in `pathway-panel.test.tsx`:

```typescript
import { fireEvent } from "@testing-library/react";

// ... existing tests ...

it("calls onPathwayClick when a pathway bar is clicked", () => {
  const onPathwayClick = jest.fn();
  render(
    <PathwayPanel
      scores={mockScores}
      scaleMode="shared"
      scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
      showVarianceFractions={false}
      showScores={false}
      showExtents={false}
      onPathwayClick={onPathwayClick}
      selectedPathways={new Set()}
    />
  );
  fireEvent.click(screen.getByText("Pathway 2").closest(".pathway-bar-row")!);
  expect(onPathwayClick).toHaveBeenCalledWith(2);
});
```

- [ ] **Step 7: Run to verify the new test fails**

Run: `npx jest src/explorer/components/pathway-panel.test.tsx --verbose`
Expected: The new test FAILS (onPathwayClick prop not passed through).

- [ ] **Step 8: Update PathwayPanel to pass through click and selection props**

In `src/explorer/components/pathway-panel.tsx`, update the interface and component:

```typescript
interface PathwayPanelProps {
  scores: number[];
  varianceFractions?: number[];
  scaleMode: ScaleMode;
  scaleExtents: ScaleExtents;
  showVarianceFractions: boolean;
  showScores: boolean;
  showExtents: boolean;
  onPathwayClick?: (index: number) => void;
  selectedPathways?: Set<number>;
}
```

Pass the new props to each PathwayBar:

```tsx
<PathwayBar
  key={i}
  index={i}
  score={score}
  scaleExtent={extent}
  varianceFraction={showVarianceFractions ? varianceFractions?.[i] : undefined}
  showScore={showScores}
  showExtents={showExtents}
  onClick={onPathwayClick}
  selected={selectedPathways?.has(i)}
/>
```

- [ ] **Step 9: Run all PathwayPanel and PathwayBar tests**

Run: `npx jest src/explorer/components/pathway-bar.test.tsx src/explorer/components/pathway-panel.test.tsx --verbose`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/explorer/components/pathway-bar.tsx src/explorer/components/pathway-bar.scss src/explorer/components/pathway-bar.test.tsx src/explorer/components/pathway-panel.tsx src/explorer/components/pathway-panel.test.tsx
git commit -m "NPW-1 feat(explorer): make pathway bars clickable with selected state"
```

---

### Task 7: Wire Everything Together in App

**Files:**
- Modify: `src/explorer/components/app.tsx`
- Modify: `src/explorer/components/app.scss`

- [ ] **Step 1: Add selectedPathways state and toggle handler**

In `app.tsx`, add state after the existing state declarations:

```typescript
const [selectedPathways, setSelectedPathways] = useState<Set<number>>(new Set());

const handlePathwayClick = (index: number) => {
  setSelectedPathways(prev => {
    const next = new Set(prev);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    return next;
  });
};
```

- [ ] **Step 2: Import WordEffectsPanel and update the layout**

Add the import at the top of `app.tsx`:

```typescript
import { WordEffectsPanel } from "./word-effects-panel";
```

Replace the `explorer-main` div contents with a two-column layout where the left column contains ReviewPanel + WordEffectsPanel:

```tsx
<div className="explorer-main">
  <div className="explorer-left-column">
    <ReviewPanel review={selectedReview} />
    {selectedPathways.size > 0 && (
      <WordEffectsPanel
        words={selectedReview.words}
        selectedPathways={selectedPathways}
      />
    )}
  </div>
  <PathwayPanel
    scores={selectedReview.pathway_scores}
    varianceFractions={selectedReview.pathway_variance_fractions}
    scaleMode={scaleMode}
    scaleExtents={scaleExtents}
    showVarianceFractions={showVarianceFractions}
    showScores={showScores}
    showExtents={showExtents}
    onPathwayClick={handlePathwayClick}
    selectedPathways={selectedPathways}
  />
</div>
```

- [ ] **Step 3: Update app.scss for the left column layout**

In `app.scss`, update `.explorer-main` and add `.explorer-left-column`:

```scss
.explorer-main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.explorer-left-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

Also remove `flex: 1` and `min-width: 0` from `.explorer-review-panel` in `review-panel.scss` since the left column wrapper now handles flex sizing. Replace with just removing those two properties (the rest of the styles stay).

- [ ] **Step 4: Run all tests**

Run: `npx jest --verbose`
Expected: All tests PASS.

- [ ] **Step 5: Manual verification**

Run: `npm start`
Open the app in the browser. Select a review. Click a pathway bar — it should highlight blue. The word effects section should appear below the review panel with colored word spans. Click another pathway bar to add a second block. Click a selected bar to deselect it.

- [ ] **Step 6: Commit**

```bash
git add src/explorer/components/app.tsx src/explorer/components/app.scss src/explorer/components/review-panel.scss
git commit -m "NPW-1 feat(explorer): wire word effects panel into app layout"
```

---

### Task 8: Update Existing Tests for 7 Pathways

**Files:**
- Modify: `src/explorer/components/pathway-panel.test.tsx`

- [ ] **Step 1: Update mock data and assertions for 7 pathways**

The new data file has 7 pathways instead of 6. Update the mock data in `pathway-panel.test.tsx`:

```typescript
const mockScores = [1.01, -0.52, -0.11, -0.50, -1.15, -0.21, 0.33];
const mockVarianceFractions = [0.9827, 0.0069, 0.0001, 0.0018, 0.0084, 0.0002, 0.0001];
const sharedExtent: [number, number] = [-7.38, 8.75];
const perPathwayExtents: [number, number][] = [
  [-1.03, 1.03], [-1.71, 8.75], [-4.64, 6.16],
  [-7.38, 5.09], [-4.62, 5.46], [-4.91, 6.68], [-3.20, 4.50],
];
```

Update the "renders all pathway bars" test to check for 7:

```typescript
it("renders all 7 pathway bars", () => {
  render(
    <PathwayPanel
      scores={mockScores}
      scaleMode="shared"
      scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
      showVarianceFractions={false}
      showScores={false}
      showExtents={false}
    />
  );
  for (let i = 0; i < 7; i++) {
    expect(screen.getByText(`Pathway ${i}`)).toBeDefined();
  }
});
```

- [ ] **Step 2: Run all tests**

Run: `npx jest --verbose`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/explorer/components/pathway-panel.test.tsx
git commit -m "NPW-1 test(explorer): update pathway panel tests for 7 pathways"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests PASS.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds with no errors.
