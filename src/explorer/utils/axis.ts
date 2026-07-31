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
