import { Series } from "../types/explorer-data";
import { FieldStats } from "./statistics";
import { formatAxisValue } from "./axis";

/**
 * The one number that characterises a field for a set of items.
 *
 * A binary field reads as the share holding its "1" value, because "31% of
 * these are sarcastic" is the sentence a reader forms anyway — "mean 0.31"
 * says the same thing in a form nobody converts in their head. Everything
 * else, pathways included, reads as a mean.
 *
 * Shared by the list row and the detail pane so a field's headline says the
 * same thing in both places.
 */
export function headlineStat(series: Series, stats: FieldStats | null): string {
  if (stats === null) return "—";
  if (series.attributeType === "binary") {
    // Binary values are 0 or 1, so the mean is the proportion holding the 1.
    const label = series.valueLabels?.[1] ?? "yes";
    return `${label} ${Math.round(stats.mean * 100)}%`;
  }
  // formatAxisValue rather than toFixed: it trims trailing zeros and renders a
  // rounded-to-zero negative as "0" instead of the "-0" that reads as a bug.
  return `mean ${formatAxisValue(stats.mean)}`;
}
