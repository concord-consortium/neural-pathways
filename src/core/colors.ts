/**
 * Colours for signed values: orange positive, blue negative. They are the darkest steps of the
 * prototype's FILL_POS and FILL_NEG ramps. The full ramps will come when something shades by
 * level. colors.scss holds the same values for stylesheets.
 */
export const POSITIVE_COLOR = "#A84A2C";
export const NEGATIVE_COLOR = "#1F4E8F";

/** Zero counts as positive, as in the prototype. */
export function signColor(value: number): string {
  return value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
}
