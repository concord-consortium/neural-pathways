import { Series } from "../types/explorer-data";
import { isUsable, mean } from "./statistics";

export interface DroppedColumn {
  label: string;
  reason: "constant" | "duplicate";
}

export interface DesignMatrix {
  columnLabels: string[];
  /** Rows are observations, columns are predictors. Centered, not standardized. */
  X: number[][];
  y: number[];
  nUsed: number;
  nAvailable: number;
  missingByPredictor: Record<string, number>;
  dropped: DroppedColumn[];
  interactionCount: number;
}

/** Above this absolute correlation a column is treated as a duplicate of an earlier one. */
const DUPLICATE_THRESHOLD = 0.999;

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let sum = 0;
  for (const value of values) {
    const d = value - m;
    sum += d * d;
  }
  return sum / (values.length - 1);
}

// Not statistics.ts's pearson(): that returns { r: number | null } to represent an
// undefined correlation, and unwrapping that per pair across this O(k^2) duplicate
// check buys nothing here — zero-variance columns are already dropped in the loop
// above, before this runs, so a genuinely undefined correlation cannot occur.
function correlation(a: number[], b: number[]): number {
  const meanA = mean(a);
  const meanB = mean(b);
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    saa += da * da;
    sbb += db * db;
    sab += da * db;
  }
  if (saa === 0 || sbb === 0) return 0;
  return sab / Math.sqrt(saa * sbb);
}

/**
 * Turns a set of predictor Series plus a target Series into a numeric design
 * matrix over complete cases.
 *
 * Listwise deletion: a row survives only when the target and every predictor are
 * usable there. missingByPredictor is computed across all rows regardless, so the
 * caller can tell the user what each predictor costs in sample size.
 *
 * Interaction columns are products of the *centered* main effects. Centering
 * before multiplying is standard practice and sharply reduces the collinearity
 * between a product and the terms it is built from.
 */
export function buildDesignMatrix(
  predictors: Series[],
  target: Series,
  includeInteractions: boolean,
): DesignMatrix {
  const nAvailable = target.values.length;

  const missingByPredictor: Record<string, number> = {};
  for (const predictor of predictors) {
    let missing = 0;
    for (const value of predictor.values) {
      if (!isUsable(value)) missing++;
    }
    missingByPredictor[predictor.key] = missing;
  }

  const keptRows: number[] = [];
  for (let i = 0; i < nAvailable; i++) {
    if (!isUsable(target.values[i])) continue;
    if (predictors.some(p => !isUsable(p.values[i]))) continue;
    keptRows.push(i);
  }

  const y = keptRows.map(i => target.values[i] as number);

  // Centered main effects, column by column.
  const rawColumns: { label: string; values: number[]; isInteraction: boolean }[] = [];
  for (const predictor of predictors) {
    const values = keptRows.map(i => predictor.values[i] as number);
    const columnMean = mean(values);
    rawColumns.push({
      label: predictor.label,
      values: values.map(v => v - columnMean),
      isInteraction: false,
    });
  }

  if (includeInteractions) {
    const mainCount = rawColumns.length;
    for (let a = 0; a < mainCount; a++) {
      for (let b = a + 1; b < mainCount; b++) {
        rawColumns.push({
          label: `${rawColumns[a].label} × ${rawColumns[b].label}`,
          values: rawColumns[a].values.map((v, i) => v * rawColumns[b].values[i]),
          isInteraction: true,
        });
      }
    }
  }

  const dropped: DroppedColumn[] = [];
  const keptColumns: typeof rawColumns = [];
  for (const column of rawColumns) {
    if (variance(column.values) === 0) {
      dropped.push({ label: column.label, reason: "constant" });
      continue;
    }
    const duplicate = keptColumns.some(
      kept => Math.abs(correlation(kept.values, column.values)) > DUPLICATE_THRESHOLD,
    );
    if (duplicate) {
      dropped.push({ label: column.label, reason: "duplicate" });
      continue;
    }
    keptColumns.push(column);
  }

  const X = keptRows.map((_, rowIndex) => keptColumns.map(column => column.values[rowIndex]));

  return {
    columnLabels: keptColumns.map(column => column.label),
    X,
    y,
    nUsed: keptRows.length,
    nAvailable,
    missingByPredictor,
    dropped,
    interactionCount: keptColumns.filter(column => column.isInteraction).length,
  };
}
