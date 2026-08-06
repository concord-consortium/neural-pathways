import { Bins } from "./statistics";

/**
 * Formats a number for an axis tick: at most three decimal places, with trailing
 * zeros removed so a whole number reads as "3" rather than "3.000".
 *
 * Three decimals matches how the rest of the app prints pathway scores, and it is
 * the precision those scores need: at two decimals, neighbouring values such as
 * 0.412, 0.415 and 0.418 all collapse to "0.41", so adjacent bars end up with the
 * same tick label AND the same hover text, leaving nothing to tell them apart.
 *
 * Fixed decimals rather than toPrecision, which would render a count like 6427 as
 * "6.43e+3".
 */
export function formatAxisValue(value: number): string {
  const rounded = Number(value.toFixed(3));
  // Number("-0.000") is -0, whose default string form is "0" — but be explicit,
  // because a tick reading "-0" looks like a bug to a reader.
  if (rounded === 0) return "0";
  return String(rounded);
}

/**
 * A categorical value as a reader should see it: the dataset's label for that
 * value when there is one, and the number itself when there is not.
 *
 * The fallback is the contract AttributeDefinition.valueLabels documents — a
 * partial map, or none at all, must degrade to the number rather than lie — and
 * it lives here so the axis under a histogram and the hover text on its bars
 * cannot come to disagree about what a bar is called.
 */
export function axisValueLabel(value: number, valueLabels?: Record<number, string>): string {
  return valueLabels?.[value] ?? formatAxisValue(value);
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

/**
 * Text for a bar's native tooltip: which slice of the column it covers, and how
 * many items fell in it.
 *
 * Lives here beside formatAxisValue rather than in a component, because two
 * charts now ask the same question of the same Bins union and their answers
 * must not drift apart.
 *
 * valueLabels names the column's own values, so a binary field reads
 * "positive" rather than "1". It applies in categorical mode only: a numeric
 * bar covers a range of values, which no single label describes.
 */
export function barTitle(
  bins: Bins, index: number, count: number, label: string, plural: string,
  valueLabels?: Record<number, string>,
): string {
  const where = bins.mode === "categorical"
    ? axisValueLabel(bins.values[index], valueLabels)
    : `${formatAxisValue(bins.edges[index])} to ${formatAxisValue(bins.edges[index + 1])}`;
  return `${label} ${where} — ${count} ${plural}`;
}
