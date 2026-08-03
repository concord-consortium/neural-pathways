# Alien Dataset Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A seeded TypeScript generator that emits ~800 alien-language conversations — text, observer notes, coded attributes, four pathway scores, exact SHAP values, and a deliberately biased model prediction — into `dist/alien-data/` in the existing S3 data format.

**Architecture:** A seven-stage pure pipeline (`scripts/alien/`) driven by one PRNG from one seed, with every authored choice isolated in a single config module (`scripts/alien-config.ts`). Two numeric solvers do the tuning work: a bisection that hits each attribute's requested correlation with its pathway, and a bisection that hits the two requested classification error rates. Eight self-checks gate the output; the CLI reports achieved values and exits non-zero if any check fails.

**Tech Stack:** TypeScript, ts-node (already a devDependency), Jest + ts-jest, Node `crypto` and `fs`. No new dependencies.

**Spec:** [../specs/2026-08-03-alien-dataset-generator-design.md](../specs/2026-08-03-alien-dataset-generator-design.md).
Surrounding project: [../specs/2026-07-30-attributes-and-alien-dataset-overview.md](../specs/2026-07-30-attributes-and-alien-dataset-overview.md).
Output format: [../../data/s3-data-format.md](../../data/s3-data-format.md).

## Global Constraints

- **No UI.** This phase creates and modifies no React components except the two one-line optional-chaining fixes in Task 2. Phase 5 wires the dataset into the explorer.
- **Determinism.** No `Date.now()`, `new Date()`, or `Math.random()` anywhere in `scripts/`. Every random value comes from the single seeded `Rng` created from `config.seed`. Same seed + same config → byte-identical `dist/alien-data/`.
- **RNG draw order is part of the contract.** Solvers must draw their noise vectors once, before bisecting, and the bisection itself must consume no randomness. The pipeline's draw order is fixed in Task 10 and must not be reordered.
- **Achieved, never requested.** Every number the summary prints about the produced dataset is measured from the produced dataset. Echoing a configured target as if it were an outcome is a defect.
- **Lint rules that bite this code** (from `eslint.config.mjs`): double quotes (`quotes`), semicolons (`@stylistic/semi`), `max-len` 120, `no-bitwise` **error** (the PRNG needs a file-level disable), `prefer-const`, `object-shorthand`, `eqeqeq` smart, `@typescript-eslint/no-shadow`.
- **Tests are colocated** as `*.test.ts` beside the module. Jest's `testRegex` already picks up anything under `scripts/`.
- **Commit at the end of every task**, with the task's tests passing and `npm run lint` clean.
- **Reuse, do not reimplement:** `pearson` from `src/explorer/utils/statistics.ts` and `logisticRegression` from `src/explorer/utils/regression.ts`. Both are dependency-free pure functions.

## The starting numbers were verified against a prototype

Every constant in Task 4 was run end to end before this plan was written, over the shipped seed and over ten more. Three of the spec's starting values did not survive that, and the corrected ones are what Task 4 ships. All three are numbers, not design.

**1. Two requested correlations are mathematically unreachable.** A binary attribute cut from a normal latent cannot correlate with that latent more strongly than `φ(z_b) / √(b(1−b))` — 0.777 at a 0.35 base rate, 0.759 at 0.30, 0.798 at the theoretical best of 0.50. So `voices_raised` at 0.85 and `resource_stressed` at 0.78 are both impossible. The realized ceilings are lower still, around 0.72, because the pathway score is a sum of word weights rather than an exact normal. **Both ship at 0.65**, which leaves the solver real headroom (`a` lands near 0.9 rather than saturating at 1.0) and keeps `voices_raised` easily findable by eye. Task 6 makes the solver detect the condition and fail with a message naming the request, the measured ceiling, and what to change.

**2. Pathway weight scales set the variance split, and `√share` is the wrong rule.** Variance rises faster than `scale²` because the word-selection tilt is itself proportional to the weight, so `√share` scaling produced a 77/11/8/4 split instead of the intended 55/20/15/10 — very nearly the real data's lopsidedness, which the spec explicitly wanted to avoid. The shipped scales `[1.0, 0.7912, 0.7308, 0.6546]` were solved numerically and land on 55.0/20.0/15.0/10.0.

**3. One weight magnitude per pathway makes the scores visibly discrete.** With every P0 word at exactly ±scale, a pathway score is an integer multiple of that scale and 800 conversations take only ~21 distinct values. That looks conspicuously synthetic, breaks the continuous-row scatter drill-down phase 3 built, and made the bias solver miss its target error rate by four points because the error count could only move in jumps of ~30 items. Giving the five words in each half distinct magnitudes `[0.55, 0.78, 1.0, 1.27, 1.55]` fixes it — 456 to 522 distinct scores per pathway — and preserves orthogonality exactly, because the proof needs the group's weight multiset to be symmetric under negation, not uniform.

**What the corrected construction produces**, at the shipped seed:

| | |
|---|---|
| variance split | 55.0 / 20.0 / 15.0 / 10.0 |
| worst pathway off-diagonal \|r\| | 0.021 |
| worst decoy \|r\| against any pathway | 0.060 |
| achieved attribute correlations | 0.652, 0.346, 0.149, 0.649 against requested 0.65, 0.35, 0.15, 0.65 |
| error rate, resource-stressed / secure | 19.6% / 2.9% |
| overall error rate | 7.9% — 63 of 800 |
| share of errors that are resource-stressed | 74.6% |
| `corr(model_correct, resource_stressed)` | **−0.2846** |
| `corr(target, resource_stressed)` | 0.012 |
| rarest vocabulary word | appears in 291 conversations |

which matches the spec's intended table (20% / 3% / 8.1% / 74% / −0.285) to within a rounding of the error counts.

**The self-check thresholds are set from the ten-seed sweep, not from this one run.** Across ten seeds the worst pathway off-diagonal was 0.078, the worst decoy correlation 0.107, the worst `corr(target, bias)` 0.033, and the weakest `corr(model_correct, bias)` 0.274. A decoy threshold of 0.08 — the obvious-looking choice — would have failed on roughly half of all reseeds, since it judges 24 correlations each with a standard error near 0.035. The shipped thresholds sit outside every observed value with margin.

## File Structure

**New — the generator:**

| File | Responsibility |
|---|---|
| `tsconfig.generator.json` | CommonJS + Node typecheck config for `scripts/`; the app's tsconfig is ESM and browser-targeted |
| `scripts/generate-alien-data.ts` | CLI entry: build config, run pipeline, print summary, set exit code |
| `scripts/alien-config.ts` | **The swap surface.** Seed, counts, vocabulary, the nine attributes with their note fragments, filler fragments, bias targets, thresholds |
| `scripts/alien/config-types.ts` | Types for everything in the config module |
| `scripts/alien/config-validation.ts` | Structural checks on the config, run before any generation |
| `scripts/alien/rng.ts` | Seeded PRNG: uniform, normal, int, weighted pick |
| `scripts/alien/conversations.ts` | Stages 1–3: latent factors, tilted word selection, standardized pathway scores |
| `scripts/alien/attributes.ts` | Stage 4: the correlation solver and the share-based quantizer |
| `scripts/alien/outcomes.ts` | Stage 5: target, classification, and the two-step bias solver |
| `scripts/alien/notes.ts` | Stage 6: the `NoteRenderer` seam and `TemplateNoteRenderer` |
| `scripts/alien/emit.ts` | Stage 7: S3 index and SHAP buckets, ids, writing to disk |
| `scripts/alien/checks.ts` | The eight self-checks |
| `scripts/alien/summary.ts` | Formats the run report |
| `scripts/alien/pipeline.ts` | Orchestration — the only module that knows the stage order |
| `docs/testing-alien-generator.md` | The phase walkthrough |

**Modified — making the shared types honest about a dataset with no activations:**

| File | Change |
|---|---|
| `src/shared/types/s3-data.ts` | `reconstruction_r2` and the five activation-model fit fields become optional; `observation`, `attributes`, and `metadata.attributes` added |
| `src/shared/types/attributes.ts` | `hidden?: boolean` added |
| `src/explorer/utils/flatten-review.ts` | Optional-chain `reconstruction_r2` |
| `src/explorer/components/app.tsx` | Optional-chain `reconstruction_r2` |
| `src/heatmap/components/app.tsx` | Optional-chain `reconstruction_r2` |
| `src/shared/data-loader.ts` | The three heatmap-only `fitTo*` functions throw a named error when the activation-model fields are absent |
| `package.json`, `webpack.config.js`, `eslint.config.mjs` | Toolchain — Task 1 |

## Known follow-ups for later phases — do not fix here

- `flattenReview` renders `classification_label` as `"positive"` / `"negative"`. For the alien dataset the right words are `"approach"` / `"wait"`. Phase 5 owns that, because the label mapping belongs to the client-side `DatasetConfig` that phase 5 creates.
- `src/shared/datasets/alien-dataset.ts` (the client-side `DatasetConfig` with `getAttributeValue`) is phase 5. Task 9 emits `metadata.attributes` so phase 5 has the definitions available, but nothing reads it yet.
- Attribute **hiding** is phase 6. Task 9 emits the `hidden` flag; the app ignores it.

---

### Task 1: Generator toolchain

Make `npm run generate:alien` a working command that type-checks, lints, and writes into `dist/alien-data/` without webpack deleting the result.

**Files:**
- Create: `tsconfig.generator.json`
- Create: `scripts/generate-alien-data.ts`
- Modify: `package.json` (scripts block, lines 37–59)
- Modify: `webpack.config.js:174`
- Modify: `eslint.config.mjs` (add two config blocks before the closing `)`)

**Interfaces:**
- Consumes: nothing.
- Produces: the command `npm run generate:alien`; the convention that generator code lives in `scripts/` and is type-checked by `tsconfig.generator.json`.

**Why the webpack change:** `dist/` is webpack's output directory and `CleanWebpackPlugin` wipes it on every build *and* on dev-server startup. Without an exclusion, generated data disappears the next time anyone runs `npm start`.

- [ ] **Step 1: Create `tsconfig.generator.json`**

The app's tsconfig targets a browser with ESM modules. ts-node needs CommonJS. `include` lists only `scripts/`; TypeScript still follows imports into `src/`, so the shared statistics helpers are type-checked too.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "noEmit": true
  },
  "include": ["scripts/**/*"]
}
```

- [ ] **Step 2: Create the entry stub `scripts/generate-alien-data.ts`**

A stub only for this task. Task 10 replaces the body with the real pipeline.

```ts
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "..", "dist", "alien-data");

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify({ reviews: [] }));
  console.log(`wrote ${OUTPUT_DIR}`);
}

main();
```

- [ ] **Step 3: Add the npm script**

In `package.json`, inside `"scripts"`, add after the `"build:top-test"` line:

```json
    "generate:alien": "ts-node --project tsconfig.generator.json scripts/generate-alien-data.ts",
```

and change the `"build"` line so a production build always contains fresh data:

```json
    "build": "npm-run-all lint:build generate:alien build:webpack",
```

- [ ] **Step 4: Keep webpack from deleting the generated data**

In `webpack.config.js`, replace line 174:

```js
      new CleanWebpackPlugin(),
```

with:

```js
      // dist/alien-data is written by `npm run generate:alien`, not by webpack.
      // Without this exclusion the default clean pattern deletes it on every
      // build and on dev-server startup.
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['**/*', '!alien-data', '!alien-data/**'],
      }),
```

Note the single quotes — `webpack.config.js` has its own eslint block that requires them.

- [ ] **Step 5: Teach eslint about `scripts/`**

In `eslint.config.mjs`, insert these two blocks immediately before the final `);`:

```js
  {
    name: "generator scripts",
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      },
    },
    rules: {
      // The generator's whole user interface is its printed run summary.
      "no-console": "off",
    },
  },
  {
    name: "rules specific to generator tests",
    files: ["scripts/**/*.test.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    extends: [
      jest.configs["flat/recommended"]
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  },
```

- [ ] **Step 6: Verify the toolchain**

```bash
npx tsc --noEmit -p tsconfig.generator.json
npm run lint
npm run generate:alien
ls dist/alien-data/index.json
```

Expected: no type errors, no lint errors, `wrote .../dist/alien-data`, and the file exists.

- [ ] **Step 7: Confirm webpack no longer eats the output**

```bash
npx webpack --mode production >/dev/null 2>&1; ls dist/alien-data/index.json
```

Expected: the file still exists. If it is gone, Step 4 did not take effect — do not proceed.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.generator.json scripts/generate-alien-data.ts package.json webpack.config.js eslint.config.mjs
git commit -m "build: add alien data generator toolchain"
```

---

### Task 2: Widen the shared types for a dataset without activations

The alien dataset has no neuron activations, so `reconstruction_r2`, `loadings`, `noise_variance`, `scaler_mean`, `scaler_scale`, and `explained_variance_total` describe nothing and are omitted rather than invented. The generator builds `S3Index` values directly, so the types must permit that. Three call sites currently index `reconstruction_r2` unconditionally and would throw at runtime on this data.

**Files:**
- Modify: `src/shared/types/s3-data.ts:11-43`
- Modify: `src/shared/types/attributes.ts` (append one field)
- Modify: `src/explorer/utils/flatten-review.ts:37`
- Modify: `src/explorer/components/app.tsx:204`
- Modify: `src/heatmap/components/app.tsx:151`
- Modify: `src/shared/data-loader.ts:64-84`
- Test: `src/explorer/utils/flatten-review.test.ts`, `src/shared/data-loader.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `S3Review.observation?: string`, `S3Review.attributes?: Record<string, number>`, `S3Index.metadata.attributes?: AttributeDefinition[]`, `AttributeDefinition.hidden?: boolean`. Task 9 emits all four.

- [ ] **Step 1: Write the failing tests**

Append to `src/explorer/utils/flatten-review.test.ts` (the file already has a `makeReview` helper — use it rather than writing a fresh literal):

```ts
  it("defaults reconstruction_r2 to 0 when the review has no reconstruction data", () => {
    const review = makeReview();
    delete review.reconstruction_r2;
    const result = flattenReview(review, "fit_a", yelpDataset);
    expect(result.reconstruction_r2).toBe(0);
  });
```

The file already has the `makeReview` helper and imports `yelpDataset` — use both rather than writing a fresh `S3Review` literal.

Append to `src/shared/data-loader.test.ts`, which already imports `fitToPathways` and defines `mockFit`:

```ts
  it("throws a named error when a fit has no activation model", () => {
    const fit: S3FaFit = { ...mockFit };
    delete fit.loadings;
    expect(() => fitToPathways(fit)).toThrow(/no activation model/);
  });
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest src/explorer/utils/flatten-review.test.ts src/shared/data-loader.test.ts
```

Expected: the first fails with a `TypeError` about reading a property of undefined; the second fails because no error is thrown (or throws a different one).

- [ ] **Step 3: Widen `src/shared/types/s3-data.ts`**

Add the import at the top of the file:

```ts
import { AttributeDefinition } from "./attributes";
```

Replace the `S3Index`, `S3FaFit`, and `S3Review` declarations with:

```ts
export interface S3Index {
  metadata: {
    fa_fits: Record<string, S3FaFit>;
    review_sets: Record<string, { count: number; description: string }>;
    /** Present on generated datasets that carry externally coded attributes. */
    attributes?: AttributeDefinition[];
  };
  reviews: S3Review[];
}

/**
 * The five activation-model fields are optional because a generated dataset has
 * no neuron activations to describe. Emitting zeros there would be inventing a
 * model that does not exist, so they are absent instead, and the heatmap-only
 * readers in data-loader.ts fail loudly rather than silently reading undefined.
 */
export interface S3FaFit {
  source_split: string;
  n_pathways: number;
  explained_variance_total?: number;
  explained_variance_per_pathway: number[];
  pathway_importance: number[];
  loadings?: number[][];       // n_pathways x 780
  noise_variance?: number[];   // 780
  scaler_mean?: number[];      // 780
  scaler_scale?: number[];     // 780
  pathway_score_min: number[]; // n_pathways
  pathway_score_max: number[]; // n_pathways
}

export interface S3Review {
  id: string;
  sources: Record<string, number[]>;
  text: string;
  target: number | null;
  target_label: string | null;
  name?: string;
  city?: string;
  state?: string;
  stars?: number;
  review_stars?: number;
  categories?: string;
  /** An observer's written note about this item. Generated datasets only. */
  observation?: string;
  /** Externally coded attribute values, keyed by attribute key. */
  attributes?: Record<string, number>;
  pathway_scores: Record<string, number[]>;
  /** Absent on datasets with no activations to reconstruct. */
  reconstruction_r2?: Record<string, number>;
  pathway_variance_fractions: Record<string, number[]>;
  has_shap?: string[];
  classification?: number;
  classification_probability?: number;
}
```

- [ ] **Step 4: Add `hidden` to `AttributeDefinition`**

In `src/shared/types/attributes.ts`, add after the `valueLabels` field, inside the interface:

```ts
  /**
   * Present in the data but not shown in the explorer. Written by the dataset
   * generator; nothing reads it until the commissioned-coding phase.
   */
  hidden?: boolean;
```

- [ ] **Step 5: Fix the three unconditional reads**

`src/explorer/utils/flatten-review.ts:37`:

```ts
    reconstruction_r2: review.reconstruction_r2?.[fitName] ?? 0,
```

`src/explorer/components/app.tsx:204`:

```ts
  const reconstructionR2 = selectedReview?.reconstruction_r2?.[selectedFitName] ?? null;
```

`src/heatmap/components/app.tsx:151`:

```ts
  const reviewR2 = selectedReview?.reconstruction_r2?.[selectedFitName] ?? null;
```

- [ ] **Step 6: Make the heatmap-only fit readers fail loudly**

In `src/shared/data-loader.ts`, add above `fitToPathways`:

```ts
/**
 * These three functions feed the heatmap, which visualizes the 780-neuron
 * activation model. A fit without that model cannot answer them, and returning
 * empty arrays would draw an empty heatmap that looks like real data.
 */
function requireActivationModel<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Fit has no activation model: "${field}" is absent`);
  }
  return value;
}
```

Then in the three functions, read every optional field through it. `fitToPathways`:

```ts
export function fitToPathways(fit: S3FaFit): Pathways {
  const loadings = requireActivationModel(fit.loadings, "loadings");
  const nNeurons = loadings[0].length;
  return {
    components: loadings,
    ...
    noise_variance: requireActivationModel(fit.noise_variance, "noise_variance"),
    ...
  };
}
```

Keep every other line of those functions as it is; only the reads of the five now-optional fields change. `fitToScaler` wraps `scaler_mean` and `scaler_scale`; `fitToMetadata` wraps `loadings` and `explained_variance_total`.

- [ ] **Step 7: Run the full suite**

```bash
npm test
npx tsc --noEmit -p tsconfig.json
```

Expected: all tests pass, including the two new ones, and no type errors. If any existing test fails because a mock now has an optional field, fix the test, not the type.

- [ ] **Step 8: Commit**

```bash
git add src/shared/types src/explorer src/heatmap src/shared/data-loader.ts
git commit -m "feat: allow S3 fits and reviews without an activation model"
```

---

### Task 3: Seeded PRNG

**Files:**
- Create: `scripts/alien/rng.ts`
- Test: `scripts/alien/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface Rng {
    next(): number;                                  // [0, 1)
    normal(): number;                                // standard normal
    int(minInclusive: number, maxInclusive: number): number;
    pick<T>(items: T[]): T;
    weightedIndex(weights: number[]): number;        // index, P(i) ∝ weights[i]
  }
  export function createRng(seed: number): Rng;
  ```
  Every other module takes an `Rng` and never creates one.

**Why mulberry32:** it is four lines, has a full 2^32 period, and does all its arithmetic in 32-bit integer space. A naive LCG written with `*` in JavaScript overflows the 2^53 float mantissa and silently produces correlated output.

- [ ] **Step 1: Write the failing test**

```ts
import { createRng } from "./rng";

describe("createRng", () => {
  it("is reproducible from the seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const first = [a.next(), a.next(), a.next()];
    const second = [b.next(), b.next(), b.next()];
    expect(first).toEqual(second);
  });

  it("gives different streams for different seeds", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("stays inside [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces a standard normal", () => {
    const rng = createRng(11);
    const values: number[] = [];
    for (let i = 0; i < 50000; i++) values.push(rng.normal());
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
  });

  it("covers both endpoints of int()", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(rng.int(2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it("respects weights", () => {
    const rng = createRng(5);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[rng.weightedIndex([1, 3, 0])]++;
    expect(counts[2]).toBe(0);
    expect(counts[1] / counts[0]).toBeGreaterThan(2.7);
    expect(counts[1] / counts[0]).toBeLessThan(3.3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx jest scripts/alien/rng.test.ts
```

Expected: FAIL — cannot resolve `./rng`.

- [ ] **Step 3: Implement `scripts/alien/rng.ts`**

```ts
/* eslint-disable no-bitwise -- mulberry32 is defined in 32-bit integer arithmetic */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Standard normal, by the Box-Muller transform. */
  normal(): number;
  /** Uniform integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: T[]): T;
  /** Index i with probability proportional to weights[i]. Weights must be >= 0. */
  weightedIndex(weights: number[]): number;
}

/**
 * mulberry32. Chosen over a hand-rolled LCG because every step stays in 32-bit
 * integer space: an LCG written with `*` in JavaScript overflows the 2^53 float
 * mantissa and returns correlated garbage that looks random enough to ship.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (): number => {
    // Box-Muller needs u1 > 0; next() can return exactly 0.
    let u1 = next();
    while (u1 === 0) u1 = next();
    const u2 = next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const int = (minInclusive: number, maxInclusive: number): number =>
    minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));

  const pick = <T>(items: T[]): T => items[int(0, items.length - 1)];

  const weightedIndex = (weights: number[]): number => {
    let total = 0;
    for (const weight of weights) total += weight;
    if (!(total > 0)) {
      throw new Error("weightedIndex: weights must include at least one positive value");
    }
    let remaining = next() * total;
    for (let i = 0; i < weights.length; i++) {
      remaining -= weights[i];
      if (remaining < 0) return i;
    }
    return weights.length - 1;
  };

  return { next, normal, int, pick, weightedIndex };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/rng.test.ts
npm run lint
```

Expected: PASS, no lint errors. If `no-bitwise` still fires, the disable comment is not on line 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/rng.ts scripts/alien/rng.test.ts
git commit -m "feat: add seeded PRNG for the alien data generator"
```

---

### Task 4: Config types, the alien config, and config validation

This task holds every authored choice in the dataset. Everything downstream reads it and nothing downstream contains a literal.

**Files:**
- Create: `scripts/alien/config-types.ts`
- Create: `scripts/alien/config-validation.ts`
- Create: `scripts/alien-config.ts`
- Test: `scripts/alien/config-validation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the types below and `export const alienConfig: AlienConfig`, plus `validateConfig(config: AlienConfig): void`.

**The vocabulary is designed so pathway scores come out uncorrelated.** Each word belongs to exactly one pathway and carries zero weight in the other three, and each pathway's ten weights are **symmetric under negation** — for every word at `+w` there is one at `−w`. That symmetry makes the pathway score an odd function of its own factor while the sampling normalizer stays even, which drives the cross-pathway covariance to exactly zero in expectation even though all forty words are drawn from one shared multinomial. Giving a word weight in two pathways, or breaking the negation symmetry, reintroduces correlation and will trip self-check 8.

**Magnitudes vary within each half** — `[0.55, 0.78, 1.0, 1.27, 1.55]` — so a pathway score is a sum over many distinct values rather than an integer multiple of one. See correction 3 above for what a single magnitude does.

**The pathway weight scales `[1.0, 0.7912, 0.7308, 0.6546]` were solved numerically** for the 55/20/15/10 variance split, not derived in closed form; the tilt makes variance rise faster than `scale²`. The realized split is measured and reported, never asserted — retuning it is phase 7's job, and the summary prints target beside realized so the loop is one edit and one read.

- [ ] **Step 1: Write `scripts/alien/config-types.ts`**

```ts
import { AttributeType } from "../../src/shared/types/attributes";

export interface VocabularyWord {
  word: string;
  /** Weight per pathway; length must equal pathwayCount. */
  weights: number[];
}

export interface AttributeConfig {
  /** Usable directly as a search field name. */
  key: string;
  label: string;
  description: string;
  type: AttributeType;
  /** Which pathway this attribute tracks, or null for a decoy. */
  pathway: number | null;
  /** Requested correlation with that pathway. Ignored when pathway is null. */
  targetR: number;
  hidden: boolean;
  /**
   * Share of items taking each value, in value order. A binary attribute lists
   * two shares, [share of 0, share of 1]; group_size lists six. Shares must be
   * positive and sum to 1.
   */
  valueShares: number[];
  /** Value of the first share. 0 for binary; 1 for an attribute counted from one. */
  minValue: number;
  valueLabels?: Record<number, string>;
  /**
   * Note fragments per value, keyed by the value itself. Every value in
   * valueShares needs at least two, and every fragment across the whole config
   * must be unique and must not be a substring of any other fragment — self-check
   * 2 identifies which value a note attests by substring match.
   */
  notes: Record<number, string[]>;
}

export interface Thresholds {
  /** How far an achieved attribute correlation may sit from its target. */
  correlationTolerance: number;
  /** Largest |r| a decoy may have with any pathway. */
  decoyMax: number;
  /** Largest |r| allowed between two different pathways. */
  pathwayOrthogonalityMax: number;
  /** Largest |corr(target, bias attribute)| — above this the model is right, not biased. */
  truthBiasMax: number;
  /** Smallest |corr(model_correct, bias attribute)| — below this the bias is unfindable. */
  detectableBiasMin: number;
  /** Fewest conversations a vocabulary word must appear in. */
  minWordOccurrences: number;
  /** SHAP additivity tolerance. */
  shapTolerance: number;
}

export interface AlienConfig {
  seed: number;
  conversationCount: number;
  pathwayCount: number;
  fitName: string;
  reviewSetName: string;
  reviewSetDescription: string;
  outputDir: string;

  minTurns: number;
  maxTurns: number;
  minWords: number;
  maxWords: number;
  /** How sharply a conversation's latent factors tilt its word selection. */
  tiltLambda: number;

  vocabulary: VocabularyWord[];
  /** Target share of pathway-score variance, per pathway. Reported against, not asserted. */
  targetVarianceShares: number[];

  attributes: AttributeConfig[];

  /** Key of the attribute the classification is unfairly biased by. */
  biasAttributeKey: string;
  /** Pathway the truth genuinely depends on. */
  truthPathway: number;
  /** Requested misclassification rate among items where the bias attribute is 1. */
  errorRateWhenBiasOn: number;
  /** Requested misclassification rate among items where it is 0. */
  errorRateWhenBiasOff: number;
  /**
   * Spreads classification_probability away from 0.5. Purely cosmetic: it scales
   * the logit and so cannot move the 0.5 decision boundary or any error rate.
   */
  logitScale: number;

  /** Non-attribute sentences mixed into every note. */
  fillerFragments: string[];
  minFillerPerNote: number;
  maxFillerPerNote: number;

  thresholds: Thresholds;
}
```

- [ ] **Step 2: Write `scripts/alien-config.ts`**

Author it exactly as below. The word list, the note fragments, and the numbers are the deliverable of this task — they are not placeholders.

```ts
import { AlienConfig, AttributeConfig, VocabularyWord } from "./alien/config-types";

/**
 * Pathway weight scales, solved numerically for the 55/20/15/10 variance split.
 * There is no closed form: the word-selection tilt is itself proportional to the
 * weight, so variance rises faster than scale^2 and sqrt(share) undershoots the
 * lower pathways badly.
 */
const SCALE = [1.0, 0.7912, 0.7308, 0.6546];

/**
 * Distinct magnitudes within each half, so a pathway score is a sum over many
 * different values rather than an integer multiple of one. A single magnitude
 * leaves only ~21 distinct scores across the whole corpus, which reads as
 * obviously synthetic and coarsens every threshold downstream.
 */
const MAGNITUDES = [0.55, 0.78, 1.0, 1.27, 1.55];

/**
 * Ten words per pathway, each carrying zero weight in every other pathway, and
 * the ten weights symmetric under negation. That symmetry is what makes the
 * pathway scores uncorrelated — see self-check 8. Nothing defines what these
 * words mean; meaning is emergent, and any gloss written here would be an
 * invention.
 */
function group(pathway: number, positives: string[], negatives: string[]): VocabularyWord[] {
  const build = (word: string, sign: number, index: number): VocabularyWord => ({
    word,
    weights: SCALE.map((scale, p) => (p === pathway ? sign * MAGNITUDES[index] * scale : 0)),
  });
  return [
    ...positives.map((word, i) => build(word, 1, i)),
    ...negatives.map((word, i) => build(word, -1, i)),
  ];
}

const vocabulary: VocabularyWord[] = [
  ...group(0, ["tarrak", "vosh", "krenn", "ulash", "drivek"],
              ["mellu", "sooma", "aloven", "quissa", "nimbar"]),
  ...group(1, ["hakku", "tovril", "sennat", "blikka", "ormesh"],
              ["vaneth", "luppo", "ishara", "karnok", "dweshi"]),
  ...group(2, ["pellum", "torva", "ganneth", "ussik", "brimo"],
              ["ledda", "oxxin", "favuun", "mirrek", "saanth"]),
  ...group(3, ["chullo", "arvek", "nembu", "tisshak", "oradda"],
              ["welvin", "murrash", "kippa", "yandor", "essulo"]),
];

const YES_NO = { 0: "no", 1: "yes" };

const attributes: AttributeConfig[] = [
  {
    key: "voices_raised",
    label: "Voices raised",
    description: "Whether any participant noticeably increased their volume during the exchange.",
    type: "binary",
    pathway: 0,
    targetR: 0.65,
    hidden: false,
    valueShares: [0.65, 0.35],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Voices rose sharply more than once.",
        "One speaker raised their voice mid-exchange.",
        "The exchange got loud enough to carry across the clearing.",
        "Volume climbed steadily through the recording.",
      ],
      0: [
        "Tones stayed level throughout.",
        "Nobody raised their voice at any point.",
        "The whole exchange stayed quiet.",
        "Volume never rose above a murmur.",
      ],
    },
  },
  {
    key: "engaged_in_task",
    label: "Engaged in a task",
    description: "Whether the participants were working on something with their hands while talking.",
    type: "binary",
    pathway: 1,
    targetR: 0.35,
    hidden: false,
    valueShares: [0.5, 0.5],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Both were working on something with their hands the whole time.",
        "The group kept at a shared task while they talked.",
        "Hands stayed busy with the work in front of them.",
        "They talked over an object they were assembling.",
      ],
      0: [
        "Nobody was working on anything.",
        "Their hands were idle from start to finish.",
        "No task was underway.",
        "They stood with nothing in front of them.",
      ],
    },
  },
  {
    key: "group_size",
    label: "Group size",
    description: "How many individuals were visible in the recording.",
    type: "integer",
    pathway: 2,
    targetR: 0.15,
    hidden: false,
    valueShares: [0.08, 0.22, 0.28, 0.22, 0.14, 0.06],
    minValue: 1,
    notes: {
      1: [
        "Only one individual was in frame; the other voice came from off-frame.",
        "A single individual visible, answering someone I could not see.",
      ],
      2: [
        "Two individuals, facing each other.",
        "A pair, standing close together.",
      ],
      3: [
        "Three individuals were present.",
        "Three of them, loosely triangular.",
      ],
      4: [
        "Four individuals were in the recording.",
        "Four present, two on each side.",
      ],
      5: [
        "Five individuals, spread out.",
        "Five of them, no clear arrangement.",
      ],
      6: [
        "Six individuals were present, the largest gathering I have recorded here.",
        "Six of them, packed into a small area.",
      ],
    },
  },
  {
    key: "near_water",
    label: "Near water",
    description: "Whether open water was within a short distance of the group.",
    type: "binary",
    pathway: null,
    targetR: 0,
    hidden: false,
    valueShares: [0.6, 0.4],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "A stream ran within a few paces of them.",
        "They were standing at the edge of open water.",
        "Running water was audible in the background.",
      ],
      0: [
        "No water anywhere nearby.",
        "The ground was dry in every direction.",
        "Nothing but dry ground all around them.",
      ],
    },
  },
  {
    key: "food_present",
    label: "Food present",
    description: "Whether food was visible within reach of the group.",
    type: "binary",
    pathway: null,
    targetR: 0,
    hidden: false,
    valueShares: [0.55, 0.45],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Food was laid out between them.",
        "They had gathered food within easy reach.",
        "There was food on the ground beside them.",
      ],
      0: [
        "No food was visible.",
        "Nothing to eat anywhere in frame.",
        "I could see no food at all.",
      ],
    },
  },
  {
    key: "resource_stressed",
    label: "Resource stressed",
    description:
      "Whether the surroundings showed scarcity rather than abundance. Coded from the state of "
      + "the area around the group, not from anything the group did.",
    type: "binary",
    pathway: 3,
    targetR: 0.65,
    hidden: true,
    valueShares: [0.7, 0.3],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "The surroundings looked picked over and bare.",
        "Stores nearby were nearly empty.",
        "Everything within reach had already been stripped.",
        "The area showed clear signs of scarcity.",
      ],
      0: [
        "The surroundings were plainly abundant.",
        "There was more than enough within easy reach.",
        "Stores nearby were full.",
        "Nothing about the area suggested scarcity.",
      ],
    },
  },
  {
    key: "gestures_repeated",
    label: "Gestures repeated",
    description: "Whether any single hand gesture recurred during the exchange.",
    type: "binary",
    pathway: null,
    targetR: 0,
    hidden: true,
    valueShares: [0.65, 0.35],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "One gesture was repeated many times over.",
        "The same hand motion came back again and again.",
        "A single gesture recurred throughout.",
      ],
      0: [
        "No gesture was repeated.",
        "Each hand motion appeared only once.",
        "I noticed nothing repeated in their gestures.",
      ],
    },
  },
  {
    key: "young_present",
    label: "Young present",
    description: "Whether any juvenile was among the individuals recorded.",
    type: "binary",
    pathway: null,
    targetR: 0,
    hidden: true,
    valueShares: [0.75, 0.25],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "At least one juvenile was present.",
        "A young one stayed close by the whole time.",
        "Juveniles were among the group.",
      ],
      0: [
        "No juveniles anywhere.",
        "Every individual present was fully grown.",
        "I saw no young ones.",
      ],
    },
  },
  {
    key: "carrying_burden",
    label: "Carrying a burden",
    description: "Whether individuals were carrying loads.",
    type: "binary",
    pathway: null,
    targetR: 0,
    hidden: true,
    valueShares: [0.7, 0.3],
    minValue: 0,
    valueLabels: YES_NO,
    notes: {
      1: [
        "Several were carrying loads on their backs.",
        "They had bundles slung over their shoulders.",
        "At least two were burdened with cargo.",
      ],
      0: [
        "Nobody carried anything.",
        "Their arms and backs were free.",
        "No loads of any kind.",
      ],
    },
  },
];

/**
 * Material that maps to no attribute at all. Without it a reader could recover
 * the entire attribute set from the notes and the coding exercise would collapse
 * into reading answers off a menu.
 */
const fillerFragments: string[] = [
  "The light was flat and grey.",
  "Recording made shortly after dawn.",
  "Wind made parts of the audio hard to follow.",
  "I stayed roughly thirty paces back.",
  "The recording runs just under four minutes.",
  "Ground was uneven where they stood.",
  "One of them glanced toward me twice.",
  "A second recorder was running from the far side.",
  "The sky stayed overcast for the whole session.",
  "I have marked this one for a second listen.",
  "Ambient noise was higher than usual.",
  "The exchange ended abruptly.",
  "They dispersed in different directions afterward.",
  "My hands were cold and these notes are shorter than I would like.",
];

export const alienConfig: AlienConfig = {
  seed: 20260803,
  conversationCount: 800,
  pathwayCount: 4,
  fitName: "alien-fa-4",
  reviewSetName: "alien",
  reviewSetDescription: "Generated alien-language conversations with observer field notes",
  outputDir: "dist/alien-data",

  minTurns: 3,
  maxTurns: 6,
  minWords: 12,
  maxWords: 40,
  tiltLambda: 0.8,

  vocabulary,
  targetVarianceShares: [0.55, 0.2, 0.15, 0.1],

  attributes,

  biasAttributeKey: "resource_stressed",
  truthPathway: 0,
  errorRateWhenBiasOn: 0.2,
  errorRateWhenBiasOff: 0.03,
  logitScale: 2.5,

  fillerFragments,
  minFillerPerNote: 2,
  maxFillerPerNote: 4,

  thresholds: {
    correlationTolerance: 0.02,
    // Judges 24 decoy-by-pathway correlations, each with a standard error near
    // 0.035, so the largest of them lands around 0.09 on a typical reseed. A
    // threshold of 0.08 would fail half the time on data that is entirely fine.
    decoyMax: 0.15,
    pathwayOrthogonalityMax: 0.12,
    truthBiasMax: 0.08,
    detectableBiasMin: 0.2,
    minWordOccurrences: 100,
    shapTolerance: 1e-9,
  },
};
```

- [ ] **Step 3: Write the failing validation test**

```ts
import { alienConfig } from "../alien-config";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";

function clone(): AlienConfig {
  return JSON.parse(JSON.stringify(alienConfig)) as AlienConfig;
}

describe("validateConfig", () => {
  it("accepts the shipped config", () => {
    expect(() => validateConfig(alienConfig)).not.toThrow();
  });

  it("rejects a duplicate vocabulary word", () => {
    const config = clone();
    config.vocabulary[1].word = config.vocabulary[0].word;
    expect(() => validateConfig(config)).toThrow(/duplicate vocabulary word/i);
  });

  it("rejects a word with weight in two pathways", () => {
    const config = clone();
    config.vocabulary[0].weights[1] = 0.4;
    expect(() => validateConfig(config)).toThrow(/exactly one pathway/i);
  });

  it("rejects a pathway group that is not symmetric under negation", () => {
    const config = clone();
    config.vocabulary[0].weights[0] = -config.vocabulary[0].weights[0];
    expect(() => validateConfig(config)).toThrow(/symmetric under negation/i);
  });

  it("rejects value shares that do not sum to one", () => {
    const config = clone();
    config.attributes[0].valueShares = [0.5, 0.4];
    expect(() => validateConfig(config)).toThrow(/sum to 1/i);
  });

  it("rejects a value with fewer than two note fragments", () => {
    const config = clone();
    config.attributes[0].notes[1] = ["only one"];
    expect(() => validateConfig(config)).toThrow(/at least two note fragments/i);
  });

  it("rejects a fragment reused across attributes", () => {
    const config = clone();
    config.attributes[1].notes[1][0] = config.attributes[0].notes[1][0];
    expect(() => validateConfig(config)).toThrow(/fragment/i);
  });

  it("rejects a fragment that contains another fragment", () => {
    const config = clone();
    config.fillerFragments[0] = `Note: ${config.attributes[0].notes[0][0]} And more.`;
    expect(() => validateConfig(config)).toThrow(/substring/i);
  });

  it("rejects an unknown bias attribute key", () => {
    const config = clone();
    config.biasAttributeKey = "nope";
    expect(() => validateConfig(config)).toThrow(/bias attribute/i);
  });

  it("rejects a bias attribute that is not binary", () => {
    const config = clone();
    config.attributes.find(a => a.key === "resource_stressed")!.type = "integer";
    expect(() => validateConfig(config)).toThrow(/binary/i);
  });

  it("rejects an attribute key that collides with a reserved search field", () => {
    const config = clone();
    config.attributes[0].key = "text";
    expect(() => validateConfig(config)).toThrow(/reserved/i);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

```bash
npx jest scripts/alien/config-validation.test.ts
```

Expected: FAIL — cannot resolve `./config-validation`.

- [ ] **Step 5: Implement `scripts/alien/config-validation.ts`**

```ts
import { validateAttributeKeys } from "../../src/shared/datasets/dataset-config";
import { AlienConfig } from "./config-types";

const SHARE_TOLERANCE = 1e-9;
const WEIGHT_TOLERANCE = 1e-9;

function checkVocabulary(config: AlienConfig): void {
  const seen = new Set<string>();
  const groupWeights: number[][] = Array.from({ length: config.pathwayCount }, () => []);

  for (const entry of config.vocabulary) {
    if (seen.has(entry.word)) {
      throw new Error(`Duplicate vocabulary word "${entry.word}"`);
    }
    seen.add(entry.word);

    if (entry.weights.length !== config.pathwayCount) {
      throw new Error(
        `Word "${entry.word}" has ${entry.weights.length} weights, expected ${config.pathwayCount}`,
      );
    }
    const nonZero = entry.weights
      .map((weight, pathway) => ({ weight, pathway }))
      .filter(item => item.weight !== 0);
    if (nonZero.length !== 1) {
      throw new Error(
        `Word "${entry.word}" must carry weight in exactly one pathway, found ${nonZero.length}. `
        + `Cross-pathway weight correlates the pathway scores and breaks the bias construction.`,
      );
    }
    groupWeights[nonZero[0].pathway].push(nonZero[0].weight);
  }

  // Each pathway's weights must be symmetric under negation: for every word at
  // +w there must be one at -w. That is the exact condition the orthogonality
  // argument rests on, and it is stronger than the weights merely summing to
  // zero.
  groupWeights.forEach((weights, pathway) => {
    if (weights.length === 0) {
      throw new Error(`Pathway ${pathway} has no words; its score would have no variance`);
    }
    const sorted = [...weights].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (Math.abs(sorted[i] + sorted[sorted.length - 1 - i]) > WEIGHT_TOLERANCE) {
        throw new Error(
          `Pathway ${pathway}'s weights are not symmetric under negation: ${sorted[i]} has no `
          + `matching ${-sorted[i]}. That symmetry is what keeps the pathway scores `
          + `uncorrelated, and losing it breaks the bias construction.`,
        );
      }
    }
  });
}

function checkAttributes(config: AlienConfig): void {
  validateAttributeKeys(config.attributes.map(attr => ({
    key: attr.key,
    label: attr.label,
    description: attr.description,
    type: attr.type,
  })));

  for (const attr of config.attributes) {
    const total = attr.valueShares.reduce((sum, share) => sum + share, 0);
    if (Math.abs(total - 1) > SHARE_TOLERANCE) {
      throw new Error(`Attribute "${attr.key}": value shares sum to ${total}, must sum to 1`);
    }
    if (attr.valueShares.some(share => share <= 0)) {
      throw new Error(`Attribute "${attr.key}": every value share must be positive`);
    }
    if (attr.type === "binary" && attr.valueShares.length !== 2) {
      throw new Error(`Attribute "${attr.key}": a binary attribute needs exactly two value shares`);
    }
    if (attr.pathway !== null
        && (attr.pathway < 0 || attr.pathway >= config.pathwayCount)) {
      throw new Error(`Attribute "${attr.key}": pathway ${attr.pathway} is out of range`);
    }
    if (attr.pathway === null && attr.targetR !== 0) {
      throw new Error(`Attribute "${attr.key}": a decoy must request targetR 0`);
    }
    for (let i = 0; i < attr.valueShares.length; i++) {
      const value = attr.minValue + i;
      const fragments = attr.notes[value];
      if (!fragments || fragments.length < 2) {
        throw new Error(
          `Attribute "${attr.key}" value ${value}: needs at least two note fragments for variety`,
        );
      }
    }
  }
}

/**
 * Self-check 2 attests an attribute value by finding one of its fragments inside
 * the note. That only identifies a value if no fragment appears anywhere else,
 * including inside a longer fragment.
 */
function checkFragmentsAreDistinguishable(config: AlienConfig): void {
  const fragments: { text: string; owner: string }[] = [];
  for (const attr of config.attributes) {
    for (const [value, list] of Object.entries(attr.notes)) {
      for (const text of list) fragments.push({ text, owner: `${attr.key}=${value}` });
    }
  }
  config.fillerFragments.forEach((text, i) => fragments.push({ text, owner: `filler[${i}]` }));

  const byText = new Map<string, string>();
  for (const fragment of fragments) {
    const existing = byText.get(fragment.text);
    if (existing) {
      throw new Error(
        `Note fragment "${fragment.text}" is used by both ${existing} and ${fragment.owner}`,
      );
    }
    byText.set(fragment.text, fragment.owner);
  }

  for (const outer of fragments) {
    for (const inner of fragments) {
      if (outer === inner) continue;
      if (outer.text.includes(inner.text)) {
        throw new Error(
          `Note fragment for ${inner.owner} is a substring of the one for ${outer.owner}`,
        );
      }
    }
  }
}

function checkBias(config: AlienConfig): void {
  const bias = config.attributes.find(attr => attr.key === config.biasAttributeKey);
  if (!bias) {
    throw new Error(`Bias attribute "${config.biasAttributeKey}" is not in the attribute list`);
  }
  if (bias.type !== "binary") {
    throw new Error(`Bias attribute "${bias.key}" must be binary`);
  }
  if (bias.pathway === config.truthPathway) {
    throw new Error(
      `Bias attribute "${bias.key}" tracks pathway ${bias.pathway}, which is also the truth `
      + `pathway. The truth would then depend on the bias attribute and the model would be `
      + `correct rather than biased.`,
    );
  }
  if (config.errorRateWhenBiasOn <= config.errorRateWhenBiasOff) {
    throw new Error("errorRateWhenBiasOn must exceed errorRateWhenBiasOff, or there is no bias");
  }
}

export function validateConfig(config: AlienConfig): void {
  if (config.targetVarianceShares.length !== config.pathwayCount) {
    throw new Error("targetVarianceShares must have one entry per pathway");
  }
  if (config.minWords < 2 * config.maxTurns) {
    throw new Error(
      `minWords (${config.minWords}) must be at least 2 * maxTurns (${2 * config.maxTurns}) `
      + `so every turn can hold two words`,
    );
  }
  checkVocabulary(config);
  checkAttributes(config);
  checkFragmentsAreDistinguishable(config);
  checkBias(config);
}
```

- [ ] **Step 6: Run the tests**

```bash
npx jest scripts/alien/config-validation.test.ts
npx tsc --noEmit -p tsconfig.generator.json
npm run lint
```

Expected: all PASS, no type or lint errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/alien-config.ts scripts/alien/config-types.ts scripts/alien/config-validation.ts scripts/alien/config-validation.test.ts
git commit -m "feat: add alien dataset config and validation"
```

---

### Task 5: Conversations — factors, tilted word selection, pathway scores

**Files:**
- Create: `scripts/alien/conversations.ts`
- Test: `scripts/alien/conversations.test.ts`

**Interfaces:**
- Consumes: `Rng` (Task 3), `AlienConfig` (Task 4).
- Produces:
  ```ts
  export interface Conversation {
    turns: string[][];   // words, grouped by turn
    factors: number[];   // f_0..f_3, kept only for diagnostics
    rawSums: number[];   // per-pathway sum of the drawn words' weights
  }
  export interface Corpus {
    conversations: Conversation[];
    scores: number[][];  // [conversation][pathway], standardized
    scoreMean: number[]; // per pathway, of rawSums
    scoreSd: number[];   // per pathway, of rawSums
  }
  export function drawConversation(config: AlienConfig, rng: Rng): Conversation;
  export function buildCorpus(config: AlienConfig, rng: Rng): Corpus;
  ```
  `scoreMean` and `scoreSd` are what Task 9 turns into SHAP base values and per-word scores.

- [ ] **Step 1: Write the failing tests**

```ts
import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus, drawConversation } from "./conversations";
import { pearson } from "../../src/explorer/utils/statistics";

describe("drawConversation", () => {
  it("respects the turn and word bounds", () => {
    const rng = createRng(1);
    for (let i = 0; i < 300; i++) {
      const conversation = drawConversation(alienConfig, rng);
      const words = conversation.turns.reduce((sum, turn) => sum + turn.length, 0);
      expect(conversation.turns.length).toBeGreaterThanOrEqual(alienConfig.minTurns);
      expect(conversation.turns.length).toBeLessThanOrEqual(alienConfig.maxTurns);
      expect(words).toBeGreaterThanOrEqual(alienConfig.minWords);
      expect(words).toBeLessThanOrEqual(alienConfig.maxWords);
      for (const turn of conversation.turns) expect(turn.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("sums the drawn words' weights exactly", () => {
    const rng = createRng(2);
    const weightOf = new Map(alienConfig.vocabulary.map(entry => [entry.word, entry.weights]));
    const conversation = drawConversation(alienConfig, rng);
    const expected = new Array(alienConfig.pathwayCount).fill(0);
    for (const turn of conversation.turns) {
      for (const word of turn) {
        weightOf.get(word)!.forEach((weight, p) => { expected[p] += weight; });
      }
    }
    conversation.rawSums.forEach((sum, p) => expect(sum).toBeCloseTo(expected[p], 12));
  });
});

describe("buildCorpus", () => {
  it("is reproducible from the seed", () => {
    const a = buildCorpus(alienConfig, createRng(alienConfig.seed));
    const b = buildCorpus(alienConfig, createRng(alienConfig.seed));
    expect(JSON.stringify(a.conversations)).toBe(JSON.stringify(b.conversations));
  });

  it("standardizes each pathway to mean 0 and sd 1", () => {
    const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const column = corpus.scores.map(row => row[p]);
      const mean = column.reduce((s, v) => s + v, 0) / column.length;
      const variance = column.reduce((s, v) => s + (v - mean) ** 2, 0) / (column.length - 1);
      expect(Math.abs(mean)).toBeLessThan(1e-10);
      expect(Math.abs(variance - 1)).toBeLessThan(1e-10);
    }
  });

  it("tilts word selection toward each conversation's own factors", () => {
    // Only that the tilt is present and points the right way. Its strength scales
    // with the pathway's weight scale, so P3's correlation is much weaker than
    // P0's, and nothing downstream depends on either number.
    const corpus = buildCorpus(alienConfig, createRng(99));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const r = pearson(corpus.conversations.map(c => c.factors[p]), corpus.scores.map(s => s[p])).r;
      expect(r).not.toBeNull();
      expect(r as number).toBeGreaterThan(0.5);
    }
  });

  it("leaves the pathway scores looking continuous, not stepped", () => {
    // A single weight magnitude per pathway would make every score an integer
    // multiple of it, leaving ~21 distinct values across the whole corpus.
    const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const distinct = new Set(corpus.scores.map(row => row[p]));
      expect(distinct.size).toBeGreaterThan(alienConfig.conversationCount / 2);
    }
  });

  it("produces near-orthogonal pathway scores", () => {
    // The bias construction depends on this: if the truth pathway correlated
    // with the bias attribute's pathway, the model would be right, not biased.
    const corpus = buildCorpus({ ...alienConfig, conversationCount: 4000 }, createRng(7));
    for (let a = 0; a < alienConfig.pathwayCount; a++) {
      for (let b = a + 1; b < alienConfig.pathwayCount; b++) {
        const r = pearson(corpus.scores.map(s => s[a]), corpus.scores.map(s => s[b])).r;
        expect(Math.abs(r as number)).toBeLessThan(0.06);
      }
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest scripts/alien/conversations.test.ts
```

Expected: FAIL — cannot resolve `./conversations`.

- [ ] **Step 3: Implement `scripts/alien/conversations.ts`**

```ts
import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export interface Conversation {
  /** Words grouped by turn. */
  turns: string[][];
  /** The latent factors that tilted this conversation's word selection. */
  factors: number[];
  /** Per-pathway sum of the drawn words' weights, before standardization. */
  rawSums: number[];
}

export interface Corpus {
  conversations: Conversation[];
  /** [conversation][pathway], standardized across the corpus. */
  scores: number[][];
  scoreMean: number[];
  scoreSd: number[];
}

/**
 * Splits a word budget across turns, giving every turn at least two words and
 * scattering the rest. Config validation guarantees minWords >= 2 * maxTurns, so
 * the budget always covers the floor.
 */
function splitAcrossTurns(totalWords: number, turnCount: number, rng: Rng): number[] {
  const lengths = new Array<number>(turnCount).fill(2);
  for (let remaining = totalWords - 2 * turnCount; remaining > 0; remaining--) {
    lengths[rng.int(0, turnCount - 1)]++;
  }
  return lengths;
}

export function drawConversation(config: AlienConfig, rng: Rng): Conversation {
  const factors: number[] = [];
  for (let p = 0; p < config.pathwayCount; p++) factors.push(rng.normal());

  // Each word's draw probability is tilted by how well it aligns with this
  // conversation's factors. Nothing downstream reads the factors again.
  const tilt = config.vocabulary.map(entry => {
    let dot = 0;
    for (let p = 0; p < config.pathwayCount; p++) dot += factors[p] * entry.weights[p];
    return Math.exp(config.tiltLambda * dot);
  });

  const turnCount = rng.int(config.minTurns, config.maxTurns);
  const totalWords = Math.max(rng.int(config.minWords, config.maxWords), 2 * turnCount);
  const lengths = splitAcrossTurns(totalWords, turnCount, rng);

  const rawSums = new Array<number>(config.pathwayCount).fill(0);
  const turns = lengths.map(length => {
    const words: string[] = [];
    for (let i = 0; i < length; i++) {
      const entry = config.vocabulary[rng.weightedIndex(tilt)];
      words.push(entry.word);
      for (let p = 0; p < config.pathwayCount; p++) rawSums[p] += entry.weights[p];
    }
    return words;
  });

  return { turns, factors, rawSums };
}

export function buildCorpus(config: AlienConfig, rng: Rng): Corpus {
  const conversations: Conversation[] = [];
  for (let i = 0; i < config.conversationCount; i++) {
    conversations.push(drawConversation(config, rng));
  }

  const scoreMean: number[] = [];
  const scoreSd: number[] = [];
  for (let p = 0; p < config.pathwayCount; p++) {
    const column = conversations.map(c => c.rawSums[p]);
    const mean = column.reduce((sum, value) => sum + value, 0) / column.length;
    const sumSquares = column.reduce((sum, value) => sum + (value - mean) ** 2, 0);
    const sd = Math.sqrt(sumSquares / (column.length - 1));
    if (!(sd > 0)) {
      throw new Error(`Pathway ${p} has no variance across the corpus; check its word weights`);
    }
    scoreMean.push(mean);
    scoreSd.push(sd);
  }

  const scores = conversations.map(c =>
    c.rawSums.map((sum, p) => (sum - scoreMean[p]) / scoreSd[p]));

  return { conversations, scores, scoreMean, scoreSd };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/conversations.test.ts
npm run lint
```

Expected: PASS. If the orthogonality test fails, the vocabulary's ±balance is wrong — fix the config, not the threshold.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/conversations.ts scripts/alien/conversations.test.ts
git commit -m "feat: generate alien conversations and pathway scores"
```

---

### Task 6: Attributes and the correlation solver

The mechanism that makes the detectability ladder tunable. For each attribute, draw an independent noise vector once, then bisect on the mixing weight `a` in `latent = a·z_p + √(1−a²)·ε` until the realized correlation lands on target.

**Files:**
- Create: `scripts/alien/attributes.ts`
- Test: `scripts/alien/attributes.test.ts`

**Interfaces:**
- Consumes: `Rng`, `AttributeConfig`, `AlienConfig`, `pearson` from `src/explorer/utils/statistics`.
- Produces:
  ```ts
  export interface SolvedAttribute {
    key: string;
    values: number[];        // one per conversation
    solvedA: number;
    /** Correlation with its own pathway; null for a decoy. */
    achievedR: number | null;
    /** The best correlation reachable at a = 1, given this base rate. */
    ceilingR: number | null;
    achievedShares: number[];
  }
  export function assignByShares(latent: number[], shares: number[], minValue: number): number[];
  export function solveAttribute(
    attribute: AttributeConfig, scores: number[][], config: AlienConfig, rng: Rng,
  ): SolvedAttribute;
  export function solveAttributes(
    scores: number[][], config: AlienConfig, rng: Rng,
  ): SolvedAttribute[];
  ```

**One quantizer, not two.** The spec describes thresholding for binary and quantizing for integer. Those are the two- and six-bin cases of one function: cut the latent vector at its own empirical quantiles so the realized value shares match the requested ones exactly. Empirical rather than normal quantiles, because the latent is only approximately normal and the realized base rate is something the summary reports.

- [ ] **Step 1: Write the failing tests**

```ts
import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { assignByShares, solveAttribute, solveAttributes } from "./attributes";
import { AttributeConfig } from "./config-types";
import { pearson } from "../../src/explorer/utils/statistics";

const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));

function attribute(key: string): AttributeConfig {
  return alienConfig.attributes.find(a => a.key === key)!;
}

describe("assignByShares", () => {
  it("realizes the requested shares", () => {
    const latent = Array.from({ length: 1000 }, (_, i) => i / 1000);
    const values = assignByShares(latent, [0.7, 0.3], 0);
    expect(values.filter(v => v === 1).length).toBe(300);
    expect(values.filter(v => v === 0).length).toBe(700);
  });

  it("offsets values by minValue and orders bins by the latent", () => {
    const latent = [0.9, 0.1, 0.5];
    expect(assignByShares(latent, [1 / 3, 1 / 3, 1 / 3], 1)).toEqual([3, 1, 2]);
  });
});

describe("solveAttribute", () => {
  it("hits the requested correlation for a strong binary attribute", () => {
    const solved = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(101));
    expect(Math.abs((solved.achievedR as number) - 0.65))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
  });

  it("hits the requested correlation for a weak binary attribute", () => {
    const solved = solveAttribute(attribute("engaged_in_task"), corpus.scores, alienConfig,
      createRng(102));
    expect(Math.abs((solved.achievedR as number) - 0.35))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
  });

  it("hits the requested correlation for an integer attribute", () => {
    const solved = solveAttribute(attribute("group_size"), corpus.scores, alienConfig,
      createRng(103));
    expect(Math.abs((solved.achievedR as number) - 0.15))
      .toBeLessThan(alienConfig.thresholds.correlationTolerance);
    expect(Math.min(...solved.values)).toBe(1);
    expect(Math.max(...solved.values)).toBe(6);
  });

  it("leaves a decoy uncorrelated with every pathway", () => {
    const solved = solveAttribute(attribute("near_water"), corpus.scores, alienConfig,
      createRng(104));
    expect(solved.solvedA).toBe(0);
    expect(solved.achievedR).toBeNull();
    for (let p = 0; p < alienConfig.pathwayCount; p++) {
      const r = pearson(solved.values, corpus.scores.map(s => s[p])).r;
      expect(Math.abs(r as number)).toBeLessThan(alienConfig.thresholds.decoyMax);
    }
  });

  it("realizes the requested value shares", () => {
    const solved = solveAttribute(attribute("resource_stressed"), corpus.scores, alienConfig,
      createRng(105));
    const ones = solved.values.filter(v => v === 1).length;
    expect(ones).toBe(Math.round(0.3 * alienConfig.conversationCount));
  });

  it("refuses a correlation above the ceiling for its base rate", () => {
    const impossible: AttributeConfig = { ...attribute("voices_raised"), targetR: 0.95 };
    expect(() => solveAttribute(impossible, corpus.scores, alienConfig, createRng(106)))
      .toThrow(/ceiling/i);
  });

  it("is reproducible", () => {
    const first = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(107));
    const second = solveAttribute(attribute("voices_raised"), corpus.scores, alienConfig,
      createRng(107));
    expect(first.values).toEqual(second.values);
    expect(first.solvedA).toBe(second.solvedA);
  });
});

describe("solveAttributes", () => {
  it("returns one entry per configured attribute, in order", () => {
    const solved = solveAttributes(corpus.scores, alienConfig, createRng(1));
    expect(solved.map(s => s.key)).toEqual(alienConfig.attributes.map(a => a.key));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest scripts/alien/attributes.test.ts
```

Expected: FAIL — cannot resolve `./attributes`.

- [ ] **Step 3: Implement `scripts/alien/attributes.ts`**

```ts
import { pearson } from "../../src/explorer/utils/statistics";
import { AlienConfig, AttributeConfig } from "./config-types";
import { Rng } from "./rng";

export interface SolvedAttribute {
  key: string;
  /** One value per conversation. */
  values: number[];
  /** The mixing weight the solver landed on. */
  solvedA: number;
  /** Realized correlation with the attribute's own pathway; null for a decoy. */
  achievedR: number | null;
  /** The strongest correlation reachable at a = 1 for this base rate; null for a decoy. */
  ceilingR: number | null;
  /** Realized share of items at each value, in value order. */
  achievedShares: number[];
}

const BISECTION_ROUNDS = 60;

/**
 * Cuts a latent vector at its own empirical quantiles, so the realized share of
 * items at each value matches the requested shares exactly rather than
 * approximately. This is one function for both binary and integer attributes:
 * a binary attribute is the two-bin case.
 */
export function assignByShares(latent: number[], shares: number[], minValue: number): number[] {
  const n = latent.length;
  const sorted = [...latent].sort((a, b) => a - b);

  // Cut points are the sorted values at each cumulative share boundary.
  const cuts: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < shares.length - 1; i++) {
    cumulative += shares[i];
    cuts.push(sorted[Math.min(Math.round(cumulative * n), n - 1)]);
  }

  return latent.map(value => {
    let bin = 0;
    while (bin < cuts.length && value >= cuts[bin]) bin++;
    return minValue + bin;
  });
}

function sharesOf(values: number[], shares: number[], minValue: number): number[] {
  return shares.map((_, i) =>
    values.filter(value => value === minValue + i).length / values.length);
}

export function solveAttribute(
  attribute: AttributeConfig,
  scores: number[][],
  config: AlienConfig,
  rng: Rng,
): SolvedAttribute {
  const n = scores.length;

  // Drawn once, before any bisection. Redrawing inside the loop would make the
  // achieved correlation a noisy, non-monotone function of `a` and the search
  // would not converge.
  const noise: number[] = [];
  for (let i = 0; i < n; i++) noise.push(rng.normal());

  if (attribute.pathway === null) {
    const values = assignByShares(noise, attribute.valueShares, attribute.minValue);
    return {
      key: attribute.key,
      values,
      solvedA: 0,
      achievedR: null,
      ceilingR: null,
      achievedShares: sharesOf(values, attribute.valueShares, attribute.minValue),
    };
  }

  const pathway = attribute.pathway;
  const column = scores.map(row => row[pathway]);

  const correlationAt = (a: number): { r: number; values: number[] } => {
    const spread = Math.sqrt(Math.max(1 - a * a, 0));
    const latent = column.map((z, i) => a * z + spread * noise[i]);
    const values = assignByShares(latent, attribute.valueShares, attribute.minValue);
    return { r: pearson(values, column).r ?? 0, values };
  };

  const ceiling = correlationAt(1).r;
  if (attribute.targetR > ceiling + config.thresholds.correlationTolerance) {
    throw new Error(
      `Attribute "${attribute.key}": requested r=${attribute.targetR} exceeds the ceiling `
      + `r=${ceiling.toFixed(3)} reachable at this value distribution. A value cut from a normal `
      + `latent cannot track it more closely than that. Lower targetR, or move the shares toward `
      + `an even split, which raises the ceiling.`,
    );
  }

  // The correlation rises monotonically with a, so plain bisection converges.
  let low = 0;
  let high = 1;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (low + high) / 2;
    if (correlationAt(middle).r < attribute.targetR) low = middle;
    else high = middle;
  }

  const solvedA = (low + high) / 2;
  const { r, values } = correlationAt(solvedA);
  return {
    key: attribute.key,
    values,
    solvedA,
    achievedR: r,
    ceilingR: ceiling,
    achievedShares: sharesOf(values, attribute.valueShares, attribute.minValue),
  };
}

export function solveAttributes(
  scores: number[][],
  config: AlienConfig,
  rng: Rng,
): SolvedAttribute[] {
  return config.attributes.map(attribute => solveAttribute(attribute, scores, config, rng));
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/attributes.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/attributes.ts scripts/alien/attributes.test.ts
git commit -m "feat: add the attribute correlation solver"
```

---

### Task 7: Outcomes — target, classification, and the bias solver

`target` depends only on the truth pathway. `classification` adds a term on the bias attribute, which the truth does not contain. So resource condition demonstrably does not predict the truth, and the model uses it anyway.

```
target         = 1{ z_truth + sigma * u > 0 }        u ~ N(0,1), drawn once
classification = 1{ z_truth + beta * bias > 0 }
probability    = sigmoid(logitScale * (z_truth + beta * bias))
```

`sigma` and `beta` are solved to hit the two requested error rates rather than configured as raw coefficients. `sigma` is solved first against the items where the bias attribute is 0 — where `beta` has no effect — and `beta` second, given `sigma`. With the shipped config the solver lands on `sigma ≈ 0.105` and `beta ≈ −0.317`, giving an overall error rate of 7.9% with 74.6% of all errors falling on the 30% of items that are resource-stressed, and `corr(model_correct, resource_stressed) ≈ −0.285`.

`beta` is **negative**: the model says "wait" too often for resource-stressed groups. That is the recognizable shape of the bias — the system withholds a favorable judgment from one group.

**Files:**
- Create: `scripts/alien/outcomes.ts`
- Test: `scripts/alien/outcomes.test.ts`

**Interfaces:**
- Consumes: `Rng`, `AlienConfig`, `SolvedAttribute` (Task 6), `pearson`.
- Produces:
  ```ts
  export interface Outcomes {
    target: number[];
    targetLabel: string[];
    classification: number[];
    classificationProbability: number[];
    modelCorrect: number[];       // 1 or 0, per conversation
    sigmaTarget: number;
    beta: number;
    achieved: {
      errorRateWhenBiasOn: number;
      errorRateWhenBiasOff: number;
      overallErrorRate: number;
      shareOfErrorsWhenBiasOn: number;
      corrCorrectWithBias: number;
      corrTargetWithBias: number;
      positiveTargetRate: number;
    };
  }
  export const TARGET_LABELS: Record<number, string>;   // { 1: "approach", 0: "wait" }
  export function solveOutcomes(
    scores: number[][], solvedAttributes: SolvedAttribute[], config: AlienConfig, rng: Rng,
  ): Outcomes;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { solveOutcomes } from "./outcomes";

const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
const solvedAttributes = solveAttributes(corpus.scores, alienConfig, createRng(2));
const outcomes = solveOutcomes(corpus.scores, solvedAttributes, alienConfig, createRng(3));

describe("solveOutcomes", () => {
  it("hits the requested error rate where the bias attribute is off", () => {
    expect(Math.abs(outcomes.achieved.errorRateWhenBiasOff - 0.03)).toBeLessThan(0.01);
  });

  it("hits the requested error rate where the bias attribute is on", () => {
    expect(Math.abs(outcomes.achieved.errorRateWhenBiasOn - 0.2)).toBeLessThan(0.01);
  });

  it("pushes the classification toward wait for the biased group", () => {
    expect(outcomes.beta).toBeLessThan(0);
  });

  it("keeps the truth independent of the bias attribute", () => {
    expect(Math.abs(outcomes.achieved.corrTargetWithBias))
      .toBeLessThan(alienConfig.thresholds.truthBiasMax);
  });

  it("leaves the bias visible in the errors", () => {
    expect(Math.abs(outcomes.achieved.corrCorrectWithBias))
      .toBeGreaterThan(alienConfig.thresholds.detectableBiasMin);
    expect(outcomes.achieved.corrCorrectWithBias).toBeLessThan(0);
  });

  it("piles most errors onto the biased group", () => {
    expect(outcomes.achieved.shareOfErrorsWhenBiasOn).toBeGreaterThan(0.6);
  });

  it("labels the target", () => {
    outcomes.target.forEach((value, i) => {
      expect(outcomes.targetLabel[i]).toBe(value === 1 ? "approach" : "wait");
    });
  });

  it("keeps the probability on the same side of 0.5 as the classification", () => {
    outcomes.classification.forEach((value, i) => {
      const probability = outcomes.classificationProbability[i];
      expect(probability).toBeGreaterThan(0);
      expect(probability).toBeLessThan(1);
      expect(probability > 0.5).toBe(value === 1);
    });
  });

  it("is reproducible", () => {
    const again = solveOutcomes(corpus.scores, solvedAttributes, alienConfig, createRng(3));
    expect(again.classification).toEqual(outcomes.classification);
    expect(again.beta).toBe(outcomes.beta);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest scripts/alien/outcomes.test.ts
```

Expected: FAIL — cannot resolve `./outcomes`.

- [ ] **Step 3: Implement `scripts/alien/outcomes.ts`**

```ts
import { pearson } from "../../src/explorer/utils/statistics";
import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export const TARGET_LABELS: Record<number, string> = { 1: "approach", 0: "wait" };

export interface OutcomeSummary {
  errorRateWhenBiasOn: number;
  errorRateWhenBiasOff: number;
  overallErrorRate: number;
  shareOfErrorsWhenBiasOn: number;
  corrCorrectWithBias: number;
  corrTargetWithBias: number;
  positiveTargetRate: number;
}

export interface Outcomes {
  target: number[];
  targetLabel: string[];
  classification: number[];
  classificationProbability: number[];
  /** 1 where the classification matched the target, 0 where it did not. */
  modelCorrect: number[];
  /** Solved noise scale on the truth. */
  sigmaTarget: number;
  /** Solved coefficient on the bias attribute. Negative. */
  beta: number;
  achieved: OutcomeSummary;
}

const BISECTION_ROUNDS = 60;
const MAX_SIGMA = 5;
const MIN_BETA = -5;

function errorRateOver(
  indices: number[], truth: number[], predicted: number[],
): number {
  if (indices.length === 0) return 0;
  let errors = 0;
  for (const i of indices) if (truth[i] !== predicted[i]) errors++;
  return errors / indices.length;
}

export function solveOutcomes(
  scores: number[][],
  solvedAttributes: SolvedAttribute[],
  config: AlienConfig,
  rng: Rng,
): Outcomes {
  const bias = solvedAttributes.find(attribute => attribute.key === config.biasAttributeKey);
  if (!bias) {
    throw new Error(`Bias attribute "${config.biasAttributeKey}" was not solved`);
  }
  const biasValues = bias.values;
  const truthScore = scores.map(row => row[config.truthPathway]);
  const n = truthScore.length;

  // Drawn once, then only rescaled by sigma, so both bisections are deterministic.
  const noise: number[] = [];
  for (let i = 0; i < n; i++) noise.push(rng.normal());

  const targetAt = (sigma: number): number[] =>
    truthScore.map((z, i) => (z + sigma * noise[i] > 0 ? 1 : 0));
  const classificationAt = (beta: number): number[] =>
    truthScore.map((z, i) => (z + beta * biasValues[i] > 0 ? 1 : 0));

  const offIndices: number[] = [];
  const onIndices: number[] = [];
  for (let i = 0; i < n; i++) (biasValues[i] === 1 ? onIndices : offIndices).push(i);
  if (onIndices.length === 0 || offIndices.length === 0) {
    throw new Error(`Bias attribute "${bias.key}" takes only one value; nothing to bias`);
  }

  // Step 1: sigma against the unbiased group, where beta cannot matter. More
  // noise on the truth means more disagreement with the model, so the error rate
  // rises monotonically with sigma.
  let sigmaLow = 0;
  let sigmaHigh = MAX_SIGMA;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (sigmaLow + sigmaHigh) / 2;
    const rate = errorRateOver(offIndices, targetAt(middle), classificationAt(0));
    if (rate < config.errorRateWhenBiasOff) sigmaLow = middle;
    else sigmaHigh = middle;
  }
  const sigmaTarget = (sigmaLow + sigmaHigh) / 2;
  const target = targetAt(sigmaTarget);

  // Step 2: beta against the biased group. beta runs negative, and the further
  // it goes the more items the model wrongly calls "wait", so the error rate
  // rises as beta falls.
  let betaLow = MIN_BETA;
  let betaHigh = 0;
  for (let round = 0; round < BISECTION_ROUNDS; round++) {
    const middle = (betaLow + betaHigh) / 2;
    const rate = errorRateOver(onIndices, target, classificationAt(middle));
    if (rate < config.errorRateWhenBiasOn) betaHigh = middle;
    else betaLow = middle;
  }
  const beta = (betaLow + betaHigh) / 2;

  const classification = classificationAt(beta);
  const classificationProbability = truthScore.map((z, i) => {
    const logit = config.logitScale * (z + beta * biasValues[i]);
    return 1 / (1 + Math.exp(-logit));
  });
  const modelCorrect = target.map((value, i) => (value === classification[i] ? 1 : 0));

  const errorRateWhenBiasOn = errorRateOver(onIndices, target, classification);
  const errorRateWhenBiasOff = errorRateOver(offIndices, target, classification);
  const totalErrors = modelCorrect.filter(value => value === 0).length;
  const errorsWhenBiasOn = onIndices.filter(i => modelCorrect[i] === 0).length;

  return {
    target,
    targetLabel: target.map(value => TARGET_LABELS[value]),
    classification,
    classificationProbability,
    modelCorrect,
    sigmaTarget,
    beta,
    achieved: {
      errorRateWhenBiasOn,
      errorRateWhenBiasOff,
      overallErrorRate: totalErrors / n,
      shareOfErrorsWhenBiasOn: totalErrors === 0 ? 0 : errorsWhenBiasOn / totalErrors,
      corrCorrectWithBias: pearson(modelCorrect, biasValues).r ?? 0,
      corrTargetWithBias: pearson(target, biasValues).r ?? 0,
      positiveTargetRate: target.reduce((sum, value) => sum + value, 0) / n,
    },
  };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/outcomes.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/outcomes.ts scripts/alien/outcomes.test.ts
git commit -m "feat: solve the alien classification bias to its target error rates"
```

---

### Task 8: Observation notes

**Files:**
- Create: `scripts/alien/notes.ts`
- Test: `scripts/alien/notes.test.ts`

**Interfaces:**
- Consumes: `Rng`, `AlienConfig`, `SolvedAttribute`.
- Produces:
  ```ts
  export interface ObservationFacts {
    attributes: Record<string, number>;   // every attribute, hidden included
    flavor: number[];                     // seeded values for non-attribute detail
  }
  export interface NoteRenderer {
    render(facts: ObservationFacts, rng: Rng): string;
  }
  export const FLAVOR_COUNT: number;
  export class TemplateNoteRenderer implements NoteRenderer { … }
  export function buildFacts(
    solvedAttributes: SolvedAttribute[], index: number, rng: Rng,
  ): ObservationFacts;
  export function renderNotes(
    solvedAttributes: SolvedAttribute[], config: AlienConfig, renderer: NoteRenderer, rng: Rng,
  ): string[];
  ```

**Why the interface exists** even though only one implementation ships: convincing notes eventually want a frontier LLM, and an LLM call is unseeded, needs credentials, and cannot run during `npm run build`. When that is wanted, `LlmNoteRenderer` writes to a content-addressed cache committed to the repo, keyed by a hash of the facts rather than the conversation id — so retuning reuses every note whose facts did not change. None of that is built here. The interface costs nothing.

**Hidden attributes get evidence too.** If a note omitted `resource_stressed`, then commissioning that coding in phase 6 would reveal something the notes never supported and the fiction that a human coder derived it from the notes would collapse.

- [ ] **Step 1: Write the failing tests**

```ts
import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { FLAVOR_COUNT, TemplateNoteRenderer, buildFacts, renderNotes } from "./notes";

const corpus = buildCorpus(alienConfig, createRng(alienConfig.seed));
const solvedAttributes = solveAttributes(corpus.scores, alienConfig, createRng(2));
const renderer = new TemplateNoteRenderer(alienConfig);
const notes = renderNotes(solvedAttributes, alienConfig, renderer, createRng(4));

describe("buildFacts", () => {
  it("carries every attribute, hidden ones included", () => {
    const facts = buildFacts(solvedAttributes, 0, createRng(1));
    expect(Object.keys(facts.attributes).sort())
      .toEqual(alienConfig.attributes.map(a => a.key).sort());
    expect(facts.attributes.resource_stressed).toBeDefined();
    expect(facts.flavor).toHaveLength(FLAVOR_COUNT);
  });
});

describe("TemplateNoteRenderer", () => {
  it("writes one note per conversation", () => {
    expect(notes).toHaveLength(alienConfig.conversationCount);
  });

  it("attests every attribute value, hidden included", () => {
    notes.forEach((note, i) => {
      for (const attribute of alienConfig.attributes) {
        const value = solvedAttributes.find(s => s.key === attribute.key)!.values[i];
        const matching = attribute.notes[value].filter(fragment => note.includes(fragment));
        expect(matching).toHaveLength(1);
      }
    });
  });

  it("never attests a value the conversation does not have", () => {
    notes.forEach((note, i) => {
      for (const attribute of alienConfig.attributes) {
        const value = solvedAttributes.find(s => s.key === attribute.key)!.values[i];
        for (const [otherValue, fragments] of Object.entries(attribute.notes)) {
          if (Number(otherValue) === value) continue;
          for (const fragment of fragments) expect(note).not.toContain(fragment);
        }
      }
    });
  });

  it("includes material that maps to no attribute", () => {
    notes.forEach(note => {
      const fillerCount = alienConfig.fillerFragments.filter(f => note.includes(f)).length;
      expect(fillerCount).toBeGreaterThanOrEqual(alienConfig.minFillerPerNote);
      expect(fillerCount).toBeLessThanOrEqual(alienConfig.maxFillerPerNote);
    });
  });

  it("varies phrasing and ordering rather than emitting one template", () => {
    expect(new Set(notes).size).toBe(notes.length);
    const opening = new Set(notes.map(note => note.slice(0, 20)));
    expect(opening.size).toBeGreaterThan(20);
  });

  it("is reproducible", () => {
    const again = renderNotes(solvedAttributes, alienConfig, renderer, createRng(4));
    expect(again).toEqual(notes);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest scripts/alien/notes.test.ts
```

Expected: FAIL — cannot resolve `./notes`.

- [ ] **Step 3: Implement `scripts/alien/notes.ts`**

```ts
import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Rng } from "./rng";

export interface ObservationFacts {
  /** Every attribute for this conversation, hidden ones included. */
  attributes: Record<string, number>;
  /** Seeded values for detail that is not an attribute. */
  flavor: number[];
}

/**
 * The seam between the deterministic core and however notes get written. Only
 * TemplateNoteRenderer ships: it needs no API key and no network, so build-time
 * generation stays deterministic. An LLM-backed renderer would read a
 * content-addressed cache keyed by the facts, never call an API during a build.
 */
export interface NoteRenderer {
  render(facts: ObservationFacts, rng: Rng): string;
}

export const FLAVOR_COUNT = 4;

export function buildFacts(
  solvedAttributes: SolvedAttribute[],
  index: number,
  rng: Rng,
): ObservationFacts {
  const attributes: Record<string, number> = {};
  for (const solved of solvedAttributes) attributes[solved.key] = solved.values[index];
  const flavor: number[] = [];
  for (let i = 0; i < FLAVOR_COUNT; i++) flavor.push(rng.next());
  return { attributes, flavor };
}

export class TemplateNoteRenderer implements NoteRenderer {
  private readonly config: AlienConfig;

  constructor(config: AlienConfig) {
    this.config = config;
  }

  render(facts: ObservationFacts, rng: Rng): string {
    const sentences: string[] = [];

    // One fragment per attribute, hidden included: phase 6 commissions a coding
    // for a hidden attribute, and that coding has to be derivable from the note.
    for (const attribute of this.config.attributes) {
      const value = facts.attributes[attribute.key];
      const fragments = attribute.notes[value];
      if (!fragments) {
        throw new Error(`Attribute "${attribute.key}" has no note fragments for value ${value}`);
      }
      sentences.push(rng.pick(fragments));
    }

    // Filler makes the note more than an enumeration of the attribute set.
    const { minFillerPerNote, maxFillerPerNote, fillerFragments } = this.config;
    const fillerCount = minFillerPerNote
      + Math.floor(facts.flavor[0] * (maxFillerPerNote - minFillerPerNote + 1));
    const remaining = [...fillerFragments];
    for (let i = 0; i < Math.min(fillerCount, remaining.length); i++) {
      sentences.push(remaining.splice(rng.int(0, remaining.length - 1), 1)[0]);
    }

    // Fisher-Yates, so the attributes do not always appear in config order.
    for (let i = sentences.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
    }

    return sentences.join(" ");
  }
}

export function renderNotes(
  solvedAttributes: SolvedAttribute[],
  config: AlienConfig,
  renderer: NoteRenderer,
  rng: Rng,
): string[] {
  const notes: string[] = [];
  for (let i = 0; i < config.conversationCount; i++) {
    notes.push(renderer.render(buildFacts(solvedAttributes, i, rng), rng));
  }
  return notes;
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/notes.test.ts
npm run lint
```

Expected: PASS. The `fillerCount` upper bound uses `facts.flavor[0] < 1`, so the count stays within `[min, max]`.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/notes.ts scripts/alien/notes.test.ts
git commit -m "feat: render observation notes from a template renderer"
```

---

### Task 9: Emit the S3 index and SHAP buckets

**Files:**
- Create: `scripts/alien/emit.ts`
- Test: `scripts/alien/emit.test.ts`

**Interfaces:**
- Consumes: everything above, plus `logisticRegression` from `src/explorer/utils/regression.ts` and the S3 types from `src/shared/types/s3-data.ts`.
- Produces:
  ```ts
  export interface Dataset {
    index: S3Index;
    shapBuckets: Map<string, S3ShapBucket>;  // keyed by two-hex bucket
    texts: string[];
    ids: string[];
  }
  export function conversationText(turns: string[][]): string;
  export function conversationId(text: string): string;
  export function buildDataset(input: BuildDatasetInput): Dataset;
  export function writeDataset(outputDir: string, dataset: Dataset): void;
  ```
  where
  ```ts
  export interface BuildDatasetInput {
    corpus: Corpus;
    solvedAttributes: SolvedAttribute[];
    outcomes: Outcomes;
    notes: string[];
    config: AlienConfig;
  }
  ```

**SHAP is exact, not approximated.** Since `z_p = (Σ w_p − μ_p) / σ_p`, each word contributes exactly `w_p / σ_p` and the base value is exactly `−μ_p / σ_p`. Nothing is rounded on the way out, so additivity holds to floating-point precision.

**Turn separators mirror the real data.** The word list opens with `[CLS]` and closes each turn with `[SEP]`, both carrying zero score in every pathway. `src/explorer/components/word-effects-panel.tsx` and `word-effect-display.tsx` already filter those two tokens out of the display, so this costs nothing on screen and keeps the format identical to the DistilBERT SHAP files.

**Omitted on purpose:** `reconstruction_r2` (there are no activations to reconstruct), and the fit's `loadings`, `noise_variance`, `scaler_mean`, `scaler_scale`, and `explained_variance_total`. Task 2 made all of those optional.

- [ ] **Step 1: Write the failing tests**

Start the file with a docblock selecting the Node environment — the default `jsdom` is wrong for a module that touches `fs` and `crypto`.

```ts
/**
 * @jest-environment node
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { alienConfig } from "../alien-config";
import { createRng } from "./rng";
import { buildCorpus } from "./conversations";
import { solveAttributes } from "./attributes";
import { solveOutcomes } from "./outcomes";
import { TemplateNoteRenderer, renderNotes } from "./notes";
import { buildDataset, conversationId, conversationText, writeDataset } from "./emit";

const config = { ...alienConfig, conversationCount: 200 };
const corpus = buildCorpus(config, createRng(config.seed));
const solvedAttributes = solveAttributes(corpus.scores, config, createRng(2));
const outcomes = solveOutcomes(corpus.scores, solvedAttributes, config, createRng(3));
const notes = renderNotes(solvedAttributes, config, new TemplateNoteRenderer(config), createRng(4));
const dataset = buildDataset({ corpus, solvedAttributes, outcomes, notes, config });

describe("conversationText and conversationId", () => {
  it("joins words within a turn and turns with newlines", () => {
    expect(conversationText([["a", "b"], ["c"]])).toBe("a b\nc");
  });

  it("hashes to 12 hex characters", () => {
    expect(conversationId("hello")).toMatch(/^[0-9a-f]{12}$/);
    expect(conversationId("hello")).toBe(conversationId("hello"));
    expect(conversationId("hello")).not.toBe(conversationId("goodbye"));
  });
});

describe("buildDataset", () => {
  it("gives every conversation a unique id", () => {
    expect(new Set(dataset.ids).size).toBe(config.conversationCount);
  });

  it("declares one fit with four pathways and no activation model", () => {
    const fit = dataset.index.metadata.fa_fits[config.fitName];
    expect(fit.n_pathways).toBe(4);
    expect(fit.source_split).toBe(config.reviewSetName);
    expect(fit.explained_variance_per_pathway).toHaveLength(4);
    expect(fit.pathway_importance).toHaveLength(4);
    expect(fit.loadings).toBeUndefined();
    expect(fit.scaler_mean).toBeUndefined();
    expect(fit.explained_variance_total).toBeUndefined();
  });

  it("orders explained variance by the configured target split", () => {
    const shares = dataset.index.metadata.fa_fits[config.fitName].explained_variance_per_pathway;
    expect(shares.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    for (let p = 1; p < shares.length; p++) expect(shares[p]).toBeLessThan(shares[p - 1]);
  });

  it("carries the attribute definitions, hidden flags included", () => {
    const definitions = dataset.index.metadata.attributes!;
    expect(definitions.map(d => d.key)).toEqual(config.attributes.map(a => a.key));
    expect(definitions.find(d => d.key === "resource_stressed")!.hidden).toBe(true);
    expect(definitions.find(d => d.key === "voices_raised")!.hidden).toBe(false);
    const groupSize = definitions.find(d => d.key === "group_size")!;
    expect(groupSize.min).toBe(1);
    expect(groupSize.max).toBe(6);
  });

  it("writes every attribute onto every review, hidden included", () => {
    for (const review of dataset.index.reviews) {
      expect(Object.keys(review.attributes!).sort())
        .toEqual(config.attributes.map(a => a.key).sort());
    }
  });

  it("omits reconstruction_r2", () => {
    for (const review of dataset.index.reviews) {
      expect(review.reconstruction_r2).toBeUndefined();
    }
  });

  it("carries observation, labels, and variance fractions", () => {
    dataset.index.reviews.forEach((review, i) => {
      expect(review.observation).toBe(notes[i]);
      expect(review.target).toBe(outcomes.target[i]);
      expect(review.target_label).toBe(outcomes.targetLabel[i]);
      expect(review.classification).toBe(outcomes.classification[i]);
      expect(review.has_shap).toEqual([config.fitName]);
      expect(review.sources).toEqual({ [config.reviewSetName]: [i] });
      const fractions = review.pathway_variance_fractions[config.fitName];
      expect(fractions.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    });
  });

  it("produces SHAP that adds up exactly", () => {
    const scoreById = new Map(dataset.index.reviews.map(r => [r.id, r.pathway_scores[config.fitName]]));
    let checked = 0;
    for (const bucket of dataset.shapBuckets.values()) {
      for (const entry of bucket.reviews) {
        const expected = scoreById.get(entry.id)!;
        for (let p = 0; p < config.pathwayCount; p++) {
          const total = entry.words.reduce((sum, word) => sum + word.scores[p], entry.base_values[p]);
          expect(Math.abs(total - expected[p])).toBeLessThan(config.thresholds.shapTolerance);
          expect(Math.abs(entry.unmasked_values[p] - expected[p])).toBeLessThan(1e-12);
        }
        checked++;
      }
    }
    expect(checked).toBe(config.conversationCount);
  });

  it("gives separator tokens zero weight in every pathway", () => {
    const first = [...dataset.shapBuckets.values()][0].reviews[0];
    expect(first.words[0].word).toBe("[CLS]");
    expect(first.words[first.words.length - 1].word).toBe("[SEP]");
    for (const word of first.words) {
      if (word.word === "[CLS]" || word.word === "[SEP]") {
        expect(word.scores.every(score => score === 0)).toBe(true);
      }
    }
  });

  it("buckets each conversation by the first two characters of its id", () => {
    for (const [bucket, contents] of dataset.shapBuckets) {
      expect(bucket).toMatch(/^[0-9a-f]{2}$/);
      for (const entry of contents.reviews) expect(entry.id.slice(0, 2)).toBe(bucket);
    }
  });
});

describe("writeDataset", () => {
  it("writes the index and the shap buckets under the fit name", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alien-emit-"));
    try {
      writeDataset(dir, dataset);
      const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
      expect(index.reviews).toHaveLength(config.conversationCount);
      const bucket = [...dataset.shapBuckets.keys()][0];
      const shapPath = path.join(dir, "shap", config.fitName, `${bucket}.json`);
      expect(fs.existsSync(shapPath)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("replaces a previous run rather than merging into it", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alien-emit-"));
    try {
      fs.mkdirSync(path.join(dir, "shap", "stale-fit"), { recursive: true });
      fs.writeFileSync(path.join(dir, "shap", "stale-fit", "aa.json"), "{}");
      writeDataset(dir, dataset);
      expect(fs.existsSync(path.join(dir, "shap", "stale-fit"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

```bash
npx jest scripts/alien/emit.test.ts
```

Expected: FAIL — cannot resolve `./emit`.

- [ ] **Step 3: Implement `scripts/alien/emit.ts`**

```ts
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { logisticRegression } from "../../src/explorer/utils/regression";
import { AttributeDefinition } from "../../src/shared/types/attributes";
import { S3Index, S3Review, S3ShapBucket, S3ShapReview } from "../../src/shared/types/s3-data";
import { SolvedAttribute } from "./attributes";
import { AlienConfig } from "./config-types";
import { Corpus } from "./conversations";
import { Outcomes } from "./outcomes";

const CLS = "[CLS]";
const SEP = "[SEP]";
const ID_LENGTH = 12;

export interface Dataset {
  index: S3Index;
  /** Keyed by the two-hex bucket, matching id.slice(0, 2). */
  shapBuckets: Map<string, S3ShapBucket>;
  texts: string[];
  ids: string[];
}

export interface BuildDatasetInput {
  corpus: Corpus;
  solvedAttributes: SolvedAttribute[];
  outcomes: Outcomes;
  notes: string[];
  config: AlienConfig;
}

export function conversationText(turns: string[][]): string {
  return turns.map(turn => turn.join(" ")).join("\n");
}

export function conversationId(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, ID_LENGTH);
}

function attributeDefinitions(config: AlienConfig): AttributeDefinition[] {
  return config.attributes.map(attribute => {
    const definition: AttributeDefinition = {
      key: attribute.key,
      label: attribute.label,
      description: attribute.description,
      type: attribute.type,
      hidden: attribute.hidden,
    };
    if (attribute.type !== "binary") {
      definition.min = attribute.minValue;
      definition.max = attribute.minValue + attribute.valueShares.length - 1;
    }
    if (attribute.valueLabels) definition.valueLabels = attribute.valueLabels;
    return definition;
  });
}

/** Each pathway's share of the total variance of the raw, pre-standardization sums. */
function explainedVariance(corpus: Corpus): number[] {
  const variances = corpus.scoreSd.map(sd => sd * sd);
  const total = variances.reduce((sum, value) => sum + value, 0);
  return variances.map(value => value / total);
}

function shapForConversation(
  id: string,
  turns: string[][],
  scores: number[],
  corpus: Corpus,
  config: AlienConfig,
  weightOf: Map<string, number[]>,
): S3ShapReview {
  const zero = new Array<number>(config.pathwayCount).fill(0);

  const words: { word: string; scores: number[] }[] = [{ word: CLS, scores: [...zero] }];
  for (const turn of turns) {
    for (const word of turn) {
      const weights = weightOf.get(word);
      if (!weights) throw new Error(`Word "${word}" is not in the vocabulary`);
      words.push({ word, scores: weights.map((weight, p) => weight / corpus.scoreSd[p]) });
    }
    words.push({ word: SEP, scores: [...zero] });
  }

  return {
    id,
    base_values: corpus.scoreMean.map((mean, p) => -mean / corpus.scoreSd[p]),
    unmasked_values: [...scores],
    words,
  };
}

export function buildDataset(input: BuildDatasetInput): Dataset {
  const { corpus, solvedAttributes, outcomes, notes, config } = input;
  const { fitName, reviewSetName } = config;

  const texts = corpus.conversations.map(conversation => conversationText(conversation.turns));
  const ids = texts.map(conversationId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error(
      `${ids.length - unique.size} conversations share an id. Two conversations drew identical `
      + `text; widen the word or turn range, or raise the vocabulary size.`,
    );
  }

  const reviews: S3Review[] = texts.map((text, i) => {
    const scores = corpus.scores[i];
    const sumOfSquares = scores.reduce((sum, value) => sum + value * value, 0);
    const attributes: Record<string, number> = {};
    for (const solved of solvedAttributes) attributes[solved.key] = solved.values[i];

    return {
      id: ids[i],
      sources: { [reviewSetName]: [i] },
      text,
      target: outcomes.target[i],
      target_label: outcomes.targetLabel[i],
      observation: notes[i],
      attributes,
      pathway_scores: { [fitName]: [...scores] },
      pathway_variance_fractions: {
        [fitName]: scores.map(value => (sumOfSquares === 0 ? 0 : (value * value) / sumOfSquares)),
      },
      has_shap: [fitName],
      classification: outcomes.classification[i],
      classification_probability: outcomes.classificationProbability[i],
    };
  });

  // Signed log-odds per standard deviation of each pathway, exactly as the real
  // fits report it, fit on the classification the model actually produced.
  const importance = logisticRegression(corpus.scores, outcomes.classification);
  if (!importance) {
    throw new Error("pathway_importance: the logistic fit failed; check the classification split");
  }

  const weightOf = new Map(config.vocabulary.map(entry => [entry.word, entry.weights]));
  const shapBuckets = new Map<string, S3ShapBucket>();
  ids.forEach((id, i) => {
    const bucket = id.slice(0, 2);
    if (!shapBuckets.has(bucket)) shapBuckets.set(bucket, { reviews: [] });
    (shapBuckets.get(bucket) as S3ShapBucket).reviews.push(shapForConversation(
      id, corpus.conversations[i].turns, corpus.scores[i], corpus, config, weightOf,
    ));
  });

  const index: S3Index = {
    metadata: {
      fa_fits: {
        [fitName]: {
          source_split: reviewSetName,
          n_pathways: config.pathwayCount,
          explained_variance_per_pathway: explainedVariance(corpus),
          pathway_importance: importance.terms.map(term => term.coefficient),
          pathway_score_min: corpus.scores[0].map((_, p) =>
            Math.min(...corpus.scores.map(row => row[p]))),
          pathway_score_max: corpus.scores[0].map((_, p) =>
            Math.max(...corpus.scores.map(row => row[p]))),
        },
      },
      review_sets: {
        [reviewSetName]: {
          count: reviews.length,
          description: config.reviewSetDescription,
        },
      },
      attributes: attributeDefinitions(config),
    },
    reviews,
  };

  return { index, shapBuckets, texts, ids };
}

export function writeDataset(outputDir: string, dataset: Dataset): void {
  // Replace rather than merge: a retune changes ids, and leftovers from the
  // previous run would sit in the buckets as conversations the index never
  // mentions.
  fs.rmSync(outputDir, { recursive: true, force: true });
  const fitName = Object.keys(dataset.index.metadata.fa_fits)[0];
  const shapDir = path.join(outputDir, "shap", fitName);
  fs.mkdirSync(shapDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, "index.json"), JSON.stringify(dataset.index));
  for (const bucket of [...dataset.shapBuckets.keys()].sort()) {
    fs.writeFileSync(
      path.join(shapDir, `${bucket}.json`),
      JSON.stringify(dataset.shapBuckets.get(bucket)),
    );
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
npx jest scripts/alien/emit.test.ts
npm run lint
```

Expected: PASS. If "orders explained variance by the configured target split" fails, the pathway weight scales in `alien-config.ts` are out of order — fix the config.

- [ ] **Step 5: Commit**

```bash
git add scripts/alien/emit.ts scripts/alien/emit.test.ts
git commit -m "feat: emit the alien dataset in the S3 data format"
```

---

### Task 10: Self-checks, summary, pipeline, and the real CLI

**Files:**
- Create: `scripts/alien/checks.ts`
- Create: `scripts/alien/summary.ts`
- Create: `scripts/alien/pipeline.ts`
- Test: `scripts/alien/checks.test.ts`, `scripts/alien/pipeline.test.ts`
- Modify: `scripts/generate-alien-data.ts` (replace the Task 1 stub entirely)

**Interfaces:**
- Consumes: every module above.
- Produces:
  ```ts
  export interface CheckResult {
    name: string;
    passed: boolean;
    detail: string;   // the measured value beside its threshold
  }
  export function runChecks(run: GeneratorRun): CheckResult[];
  export function checksPassed(results: CheckResult[]): boolean;
  export function formatSummary(run: GeneratorRun, checks: CheckResult[]): string;
  export interface GeneratorRun {
    config: AlienConfig;
    corpus: Corpus;
    solvedAttributes: SolvedAttribute[];
    outcomes: Outcomes;
    notes: string[];
    dataset: Dataset;
  }
  export function generate(config: AlienConfig): GeneratorRun;
  ```

**The fixed RNG draw order** — one `Rng`, consumed in this order, and reordering it changes every value in the dataset:

1. `buildCorpus` — per conversation: four factors, turn count, word count, turn split, then each word.
2. `solveAttributes` — per attribute in config order: one noise vector of length `n`.
3. `solveOutcomes` — one noise vector of length `n`.
4. `renderNotes` — per conversation: `FLAVOR_COUNT` flavor values, then one fragment per attribute, then the filler picks, then the shuffle.

- [ ] **Step 1: Write the failing checks test**

```ts
import { alienConfig } from "../alien-config";
import { generate } from "./pipeline";
import { runChecks } from "./checks";

const run = generate(alienConfig);
const checks = runChecks(run);

describe("runChecks", () => {
  it("reports all eight checks", () => {
    expect(checks).toHaveLength(8);
    expect(checks.map(c => c.name)).toEqual([
      "shap-additivity",
      "note-evidence",
      "achieved-correlations",
      "word-coverage",
      "truth-is-unbiased",
      "bias-is-detectable",
      "decoys-are-decoys",
      "pathways-are-orthogonal",
    ]);
  });

  it("passes on the shipped config", () => {
    const failed = checks.filter(check => !check.passed);
    expect(failed.map(f => `${f.name}: ${f.detail}`)).toEqual([]);
  });

  it("always states a measured value, whether it passed or not", () => {
    for (const check of checks) expect(check.detail).toMatch(/\d/);
  });

  it("fails truth-is-unbiased when the truth is made to track the bias attribute", () => {
    const bias = run.solvedAttributes.find(a => a.key === alienConfig.biasAttributeKey)!;
    const rigged = {
      ...run,
      outcomes: { ...run.outcomes, target: [...bias.values] },
    };
    const result = runChecks(rigged).find(c => c.name === "truth-is-unbiased")!;
    expect(result.passed).toBe(false);
  });

  it("fails bias-is-detectable when the model never errs on the biased group", () => {
    const rigged = {
      ...run,
      outcomes: {
        ...run.outcomes,
        modelCorrect: run.outcomes.modelCorrect.map(() => 1),
      },
    };
    const result = runChecks(rigged).find(c => c.name === "bias-is-detectable")!;
    expect(result.passed).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing pipeline test**

```ts
/**
 * @jest-environment node
 */
import { alienConfig } from "../alien-config";
import { generate } from "./pipeline";
import { runChecks } from "./checks";
import { formatSummary } from "./summary";

describe("generate", () => {
  it("is deterministic from the seed", () => {
    const a = generate(alienConfig);
    const b = generate(alienConfig);
    expect(JSON.stringify(a.dataset.index)).toBe(JSON.stringify(b.dataset.index));
  });

  it("changes completely with a different seed", () => {
    const a = generate(alienConfig);
    const b = generate({ ...alienConfig, seed: alienConfig.seed + 1 });
    expect(a.dataset.ids[0]).not.toBe(b.dataset.ids[0]);
  });

  it("produces the configured number of conversations", () => {
    const run = generate(alienConfig);
    expect(run.dataset.index.reviews).toHaveLength(alienConfig.conversationCount);
    expect(run.notes).toHaveLength(alienConfig.conversationCount);
  });
});

describe("formatSummary", () => {
  it("reports achieved correlations beside the requested ones", () => {
    const run = generate(alienConfig);
    const summary = formatSummary(run, runChecks(run));
    expect(summary).toContain("voices_raised");
    expect(summary).toContain("resource_stressed");
    expect(summary).toContain("requested");
    expect(summary).toContain("achieved");
    expect(summary).toContain("pathways-are-orthogonal");
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

```bash
npx jest scripts/alien/checks.test.ts scripts/alien/pipeline.test.ts
```

Expected: FAIL — cannot resolve `./pipeline`.

- [ ] **Step 4: Implement `scripts/alien/pipeline.ts`**

```ts
import { SolvedAttribute, solveAttributes } from "./attributes";
import { validateConfig } from "./config-validation";
import { AlienConfig } from "./config-types";
import { Corpus, buildCorpus } from "./conversations";
import { Dataset, buildDataset } from "./emit";
import { Outcomes, solveOutcomes } from "./outcomes";
import { TemplateNoteRenderer, renderNotes } from "./notes";
import { createRng } from "./rng";

export interface GeneratorRun {
  config: AlienConfig;
  corpus: Corpus;
  solvedAttributes: SolvedAttribute[];
  outcomes: Outcomes;
  notes: string[];
  dataset: Dataset;
}

/**
 * The stage order, and with it the order the single PRNG is consumed in. Both
 * are part of the output: reordering either changes every value in the dataset
 * for a given seed.
 */
export function generate(config: AlienConfig): GeneratorRun {
  validateConfig(config);
  const rng = createRng(config.seed);

  const corpus = buildCorpus(config, rng);
  const solvedAttributes = solveAttributes(corpus.scores, config, rng);
  const outcomes = solveOutcomes(corpus.scores, solvedAttributes, config, rng);
  const notes = renderNotes(solvedAttributes, config, new TemplateNoteRenderer(config), rng);
  const dataset = buildDataset({ corpus, solvedAttributes, outcomes, notes, config });

  return { config, corpus, solvedAttributes, outcomes, notes, dataset };
}
```

- [ ] **Step 5: Implement `scripts/alien/checks.ts`**

```ts
import { pearson } from "../../src/explorer/utils/statistics";
import { SolvedAttribute } from "./attributes";
import { GeneratorRun } from "./pipeline";

export interface CheckResult {
  name: string;
  passed: boolean;
  /** The measured value beside the threshold it was judged against. */
  detail: string;
}

function worst(values: number[]): number {
  return values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
}

/**
 * Lookup that fails loudly. `no-non-null-assertion` is on outside tests, and
 * silently treating a missing attribute as absent would turn a config mistake
 * into a check that quietly passes.
 */
function solvedFor(solvedAttributes: SolvedAttribute[], key: string): SolvedAttribute {
  const solved = solvedAttributes.find(entry => entry.key === key);
  if (!solved) throw new Error(`Attribute "${key}" was not solved`);
  return solved;
}

function shapAdditivity(run: GeneratorRun): CheckResult {
  const { config, dataset } = run;
  const scoreById = new Map(
    dataset.index.reviews.map(review => [review.id, review.pathway_scores[config.fitName]]),
  );
  let largest = 0;
  for (const bucket of dataset.shapBuckets.values()) {
    for (const entry of bucket.reviews) {
      const expected = scoreById.get(entry.id) as number[];
      for (let p = 0; p < config.pathwayCount; p++) {
        const total = entry.words.reduce((sum, word) => sum + word.scores[p], entry.base_values[p]);
        largest = Math.max(largest, Math.abs(total - expected[p]));
      }
    }
  }
  const limit = config.thresholds.shapTolerance;
  return {
    name: "shap-additivity",
    passed: largest <= limit,
    detail: `largest deviation ${largest.toExponential(2)} (limit ${limit.toExponential(2)})`,
  };
}

function noteEvidence(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, notes } = run;
  const problems: string[] = [];
  notes.forEach((note, i) => {
    for (const attribute of config.attributes) {
      const value = solvedFor(solvedAttributes, attribute.key).values[i];
      const attesting = attribute.notes[value].filter(fragment => note.includes(fragment));
      if (attesting.length !== 1) {
        problems.push(`item ${i} ${attribute.key}=${value} attested ${attesting.length} times`);
      }
      for (const [other, fragments] of Object.entries(attribute.notes)) {
        if (Number(other) === value) continue;
        if (fragments.some(fragment => note.includes(fragment))) {
          problems.push(`item ${i} ${attribute.key} note attests a value it does not have`);
        }
      }
    }
  });
  return {
    name: "note-evidence",
    passed: problems.length === 0,
    detail: problems.length === 0
      ? `all ${notes.length} notes attest all ${config.attributes.length} attributes exactly once`
      : `${problems.length} problems, first: ${problems[0]}`,
  };
}

function achievedCorrelations(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes } = run;
  const tolerance = config.thresholds.correlationTolerance;
  const misses: string[] = [];
  let largest = 0;
  for (const attribute of config.attributes) {
    if (attribute.pathway === null) continue;
    const achieved = solvedFor(solvedAttributes, attribute.key).achievedR ?? 0;
    const gap = Math.abs(achieved - attribute.targetR);
    largest = Math.max(largest, gap);
    if (gap > tolerance) {
      misses.push(`${attribute.key} requested ${attribute.targetR} achieved ${achieved.toFixed(3)}`);
    }
  }
  return {
    name: "achieved-correlations",
    passed: misses.length === 0,
    detail: misses.length === 0
      ? `largest gap ${largest.toFixed(4)} (tolerance ${tolerance})`
      : misses.join("; "),
  };
}

function wordCoverage(run: GeneratorRun): CheckResult {
  const { config, corpus } = run;
  const counts = new Map<string, number>(config.vocabulary.map(entry => [entry.word, 0]));
  for (const conversation of corpus.conversations) {
    // Counts conversations, not occurrences: a word used ten times in one
    // conversation still gives a reader only one place to see its effect.
    const seen = new Set<string>();
    for (const turn of conversation.turns) for (const word of turn) seen.add(word);
    for (const word of seen) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const minimum = config.thresholds.minWordOccurrences;
  const rare = [...counts.entries()].filter(([, count]) => count < minimum);
  const lowest = Math.min(...counts.values());
  return {
    name: "word-coverage",
    passed: rare.length === 0,
    detail: rare.length === 0
      ? `rarest word appears in ${lowest} conversations (minimum ${minimum})`
      : `${rare.length} words below ${minimum}: ${rare.map(([word]) => word).join(", ")}`,
  };
}

function truthIsUnbiased(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, outcomes } = run;
  const bias = solvedFor(solvedAttributes, config.biasAttributeKey);
  const r = pearson(outcomes.target, bias.values).r ?? 0;
  const limit = config.thresholds.truthBiasMax;
  return {
    name: "truth-is-unbiased",
    passed: Math.abs(r) <= limit,
    detail: `corr(target, ${config.biasAttributeKey}) = ${r.toFixed(4)} (limit ${limit}). `
      + `Above the limit the truth tracks the attribute and the model is correct, not biased.`,
  };
}

function biasIsDetectable(run: GeneratorRun): CheckResult {
  const { config, solvedAttributes, outcomes } = run;
  const bias = solvedFor(solvedAttributes, config.biasAttributeKey);
  const r = pearson(outcomes.modelCorrect, bias.values).r ?? 0;
  const minimum = config.thresholds.detectableBiasMin;
  return {
    name: "bias-is-detectable",
    passed: Math.abs(r) >= minimum,
    detail: `corr(model_correct, ${config.biasAttributeKey}) = ${r.toFixed(4)} `
      + `(minimum magnitude ${minimum}). Below it the bias is there but too weak to find.`,
  };
}

function decoysAreDecoys(run: GeneratorRun): CheckResult {
  const { config, corpus, solvedAttributes } = run;
  const limit = config.thresholds.decoyMax;
  const offenders: string[] = [];
  let largest = 0;
  for (const attribute of config.attributes) {
    if (attribute.pathway !== null) continue;
    const values = solvedFor(solvedAttributes, attribute.key).values;
    for (let p = 0; p < config.pathwayCount; p++) {
      const r = pearson(values, corpus.scores.map(row => row[p])).r ?? 0;
      largest = Math.max(largest, Math.abs(r));
      if (Math.abs(r) > limit) {
        offenders.push(`${attribute.key} vs pathway ${p}: ${r.toFixed(3)}`);
      }
    }
  }
  return {
    name: "decoys-are-decoys",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `largest decoy correlation ${largest.toFixed(4)} (limit ${limit})`
      : offenders.join("; "),
  };
}

function pathwaysAreOrthogonal(run: GeneratorRun): CheckResult {
  const { config, corpus } = run;
  const limit = config.thresholds.pathwayOrthogonalityMax;
  const offenders: string[] = [];
  const offDiagonal: number[] = [];
  for (let a = 0; a < config.pathwayCount; a++) {
    for (let b = a + 1; b < config.pathwayCount; b++) {
      const r = pearson(corpus.scores.map(row => row[a]), corpus.scores.map(row => row[b])).r ?? 0;
      offDiagonal.push(r);
      if (Math.abs(r) > limit) offenders.push(`P${a} vs P${b}: ${r.toFixed(3)}`);
    }
  }
  return {
    name: "pathways-are-orthogonal",
    passed: offenders.length === 0,
    detail: offenders.length === 0
      ? `largest off-diagonal |r| ${worst(offDiagonal).toFixed(4)} (limit ${limit})`
      : `${offenders.join("; ")}. Correlated pathways undermine both bias checks above.`,
  };
}

export function runChecks(run: GeneratorRun): CheckResult[] {
  return [
    shapAdditivity(run),
    noteEvidence(run),
    achievedCorrelations(run),
    wordCoverage(run),
    truthIsUnbiased(run),
    biasIsDetectable(run),
    decoysAreDecoys(run),
    pathwaysAreOrthogonal(run),
  ];
}

export function checksPassed(results: CheckResult[]): boolean {
  return results.every(result => result.passed);
}
```

- [ ] **Step 6: Implement `scripts/alien/summary.ts`**

```ts
import { pearson } from "../../src/explorer/utils/statistics";
import { SolvedAttribute } from "./attributes";
import { CheckResult } from "./checks";
import { GeneratorRun } from "./pipeline";

function solvedFor(solvedAttributes: SolvedAttribute[], key: string): SolvedAttribute {
  const solved = solvedAttributes.find(entry => entry.key === key);
  if (!solved) throw new Error(`Attribute "${key}" was not solved`);
  return solved;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export function formatSummary(run: GeneratorRun, checks: CheckResult[]): string {
  const { config, corpus, solvedAttributes, outcomes, dataset } = run;
  const lines: string[] = [];

  lines.push(`alien dataset — seed ${config.seed}, ${config.conversationCount} conversations`);
  lines.push(`output ${config.outputDir}, fit "${config.fitName}"`);
  lines.push("");

  const fit = dataset.index.metadata.fa_fits[config.fitName];
  lines.push("variance split (target -> realized)");
  fit.explained_variance_per_pathway.forEach((realized, p) => {
    lines.push(`  P${p}  ${percent(config.targetVarianceShares[p])} -> ${percent(realized)}`);
  });
  lines.push("");

  lines.push("pathway x pathway correlation");
  for (let a = 0; a < config.pathwayCount; a++) {
    const row = [];
    for (let b = 0; b < config.pathwayCount; b++) {
      const r = a === b
        ? 1
        : pearson(corpus.scores.map(s => s[a]), corpus.scores.map(s => s[b])).r ?? 0;
      row.push(pad(r.toFixed(3), 8));
    }
    lines.push(`  P${a}  ${row.join("")}`);
  }
  lines.push("");

  lines.push("attributes");
  lines.push(`  ${pad("key", 20)}${pad("pathway", 9)}${pad("requested", 11)}`
    + `${pad("achieved", 10)}${pad("ceiling", 9)}${pad("hidden", 8)}shares`);
  for (const attribute of config.attributes) {
    const solved = solvedFor(solvedAttributes, attribute.key);
    lines.push(
      `  ${pad(attribute.key, 20)}`
      + `${pad(attribute.pathway === null ? "decoy" : `P${attribute.pathway}`, 9)}`
      + `${pad(attribute.pathway === null ? "-" : attribute.targetR.toFixed(3), 11)}`
      + `${pad(solved.achievedR === null ? "-" : solved.achievedR.toFixed(3), 10)}`
      + `${pad(solved.ceilingR === null ? "-" : solved.ceilingR.toFixed(3), 9)}`
      + `${pad(attribute.hidden ? "yes" : "no", 8)}`
      + solved.achievedShares.map(share => percent(share)).join(" "),
    );
  }
  lines.push("");

  const achieved = outcomes.achieved;
  lines.push("classification");
  lines.push(`  solved sigma_target ${outcomes.sigmaTarget.toFixed(4)}, `
    + `beta ${outcomes.beta.toFixed(4)} on "${config.biasAttributeKey}"`);
  lines.push(`  target positive rate            ${percent(achieved.positiveTargetRate)}`);
  lines.push(`  error rate, ${config.biasAttributeKey}=1   `
    + `${percent(config.errorRateWhenBiasOn)} requested -> `
    + `${percent(achieved.errorRateWhenBiasOn)} achieved`);
  lines.push(`  error rate, ${config.biasAttributeKey}=0   `
    + `${percent(config.errorRateWhenBiasOff)} requested -> `
    + `${percent(achieved.errorRateWhenBiasOff)} achieved`);
  lines.push(`  overall error rate              ${percent(achieved.overallErrorRate)}`);
  lines.push(`  share of errors on the group    ${percent(achieved.shareOfErrorsWhenBiasOn)}`);
  lines.push(`  corr(model_correct, bias)       ${achieved.corrCorrectWithBias.toFixed(4)}`);
  lines.push(`  corr(target, bias)              ${achieved.corrTargetWithBias.toFixed(4)}`);
  lines.push("");

  lines.push("self-checks");
  for (const check of checks) {
    lines.push(`  ${check.passed ? "PASS" : "FAIL"}  ${pad(check.name, 26)}${check.detail}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 7: Replace `scripts/generate-alien-data.ts`**

```ts
import * as path from "path";
import { alienConfig } from "./alien-config";
import { checksPassed, runChecks } from "./alien/checks";
import { writeDataset } from "./alien/emit";
import { generate } from "./alien/pipeline";
import { formatSummary } from "./alien/summary";

function main(): void {
  const run = generate(alienConfig);
  const checks = runChecks(run);
  const outputDir = path.resolve(__dirname, "..", alienConfig.outputDir);

  writeDataset(outputDir, run.dataset);
  console.log(formatSummary(run, checks));
  console.log("");
  console.log(`wrote ${run.dataset.index.reviews.length} conversations to ${outputDir}`);

  if (!checksPassed(checks)) {
    console.error("");
    console.error("One or more self-checks failed. The dataset was written so you can inspect it, "
      + "but it should not be shipped in this state.");
    process.exitCode = 1;
  }
}

main();
```

- [ ] **Step 8: Run everything**

```bash
npx jest scripts/
npm run generate:alien
echo "exit: $?"
```

Expected: all tests pass; the summary prints; every self-check reads PASS; exit code 0. Read the printed summary and confirm by eye that the numbers are plausible — roughly 8% overall error, ~74% of errors on the biased group, and `corr(model_correct, resource_stressed)` near −0.28.

- [ ] **Step 9: Confirm the output is byte-identical across runs**

```bash
npm run generate:alien >/dev/null && shasum dist/alien-data/index.json
npm run generate:alien >/dev/null && shasum dist/alien-data/index.json
```

Expected: the two hashes match. If they do not, something is reading a clock or `Math.random`.

- [ ] **Step 10: Confirm the whole suite and the build still pass**

```bash
npm test
npm run lint
npx tsc --noEmit -p tsconfig.generator.json
```

- [ ] **Step 11: Commit**

```bash
git add scripts/alien/checks.ts scripts/alien/checks.test.ts scripts/alien/summary.ts scripts/alien/pipeline.ts scripts/alien/pipeline.test.ts scripts/generate-alien-data.ts
git commit -m "feat: wire the alien generator pipeline, self-checks, and run summary"
```

---

### Task 11: The phase walkthrough

Every phase ships a document describing how to exercise what it added — see the overview spec's "Every Phase Ships a Walkthrough" section. This generator has no UI, so it gets its own document rather than an extension of `docs/testing-correlations-view.md`.

**Files:**
- Create: `docs/testing-alien-generator.md`

**Interfaces:**
- Consumes: the working generator from Task 10.
- Produces: nothing code-level.

- [ ] **Step 1: Run the generator and capture its real output**

```bash
npm run generate:alien | tee /tmp/alien-summary.txt
```

Every number quoted in the document must come from this run. Do not write numbers from the plan or the spec into the walkthrough — they were predictions, and the point of the document is to show a reader what the tool actually says.

- [ ] **Step 2: Write `docs/testing-alien-generator.md`**

Match the format of `docs/testing-correlations-view.md`: a short intro naming what was added and how to run it, then numbered sections, each stating what to do, what you should see, and what would count as a bug. Close with a "Known rough edges — already known, no need to report" section.

Required sections, in this order:

1. **Running it.** `npm run generate:alien`, roughly how long it takes, where the files land, and that `npm run build` runs it too. Note that `dist/alien-data/` survives a webpack build by design, and how to force a regenerate.
2. **Reading the run summary.** Walk each block of the real output: the variance split, the pathway correlation matrix, the attribute table, the classification block, the self-check list. Say what a healthy value looks like in each.
3. **Requested versus achieved.** Point out that the attribute table prints both, and that the achieved column is measured from the produced data. Note the ceiling column and what it means: a binary attribute cut from a latent cannot track that latent perfectly, so the reachable maximum sits near 0.72 here and falls as the value split moves away from even. Quote the real ceiling column rather than that figure.
4. **The eight self-checks, one subsection each.** For every check: what it measures, what a failure means, and what to change. Checks 5, 6, and 8 need the most: 5 failing means the truth has started tracking resource condition and the model is no longer biased but correct; 6 failing means the bias is present but too weak to find; 8 failing means the vocabulary weights have drifted into correlated columns, which quietly undermines both.
5. **Changing a parameter and confirming it took.** A concrete worked example: open `scripts/alien-config.ts`, change `voices_raised`'s `targetR` from 0.65 to 0.4, rerun, and confirm the achieved column moved and the self-checks still pass. Then put it back.
6. **Changing the seed.** Show that a different seed produces a completely different dataset that still satisfies every check — which is the evidence that the checks constrain the construction rather than one lucky draw.
7. **Deliberately breaking it.** Two exercises that must fail loudly: set `voices_raised`'s `targetR` to 0.95 and confirm the ceiling error names both numbers; give one vocabulary word a weight in a second pathway and confirm config validation refuses it.
8. **Inspecting the output files.** The layout of `dist/alien-data/`, a `jq` one-liner or two for looking at a single conversation and its SHAP entry, and confirmation that `[CLS]`/`[SEP]` carry zero scores and that word scores plus base value equal the pathway score.
9. **What is not here yet.** No UI — phase 5 wires this into the explorer. Attributes marked `hidden` are emitted but nothing acts on the flag until phase 6. Notes are template-written; the `NoteRenderer` seam exists for an LLM-backed renderer that is not built. Parameters are starting values, not tuned ones — that is phase 7.

Under "Known rough edges", record at minimum: the notes are visibly templated and will read repetitively at 800 items; `group_size` is provisional and may be cut; and the `classification_label` wording in the explorer still says positive/negative, which phase 5 fixes.

- [ ] **Step 3: Verify every command in the document actually works**

Run each command block from the document exactly as written and confirm the described output. Any command that does not work as written is a bug in the document.

- [ ] **Step 4: Commit**

```bash
git add docs/testing-alien-generator.md
git commit -m "docs: add the alien dataset generator walkthrough"
```

---

## Definition of Done

- `npm run generate:alien` writes `dist/alien-data/index.json` and `dist/alien-data/shap/alien-fa-4/*.json`, prints a summary, and exits 0.
- Running it twice produces byte-identical output.
- All eight self-checks pass, and each prints the measured value it was judged on.
- `npm test`, `npm run lint`, and `npx tsc --noEmit -p tsconfig.generator.json` are clean.
- A webpack build does not delete the generated data.
- `docs/testing-alien-generator.md` describes how to run, read, tune, and break the generator, and every command in it works.
