/** Five steps of orange for positive word scores, palest first. */
export const FILL_POS: readonly string[] = ["#EFD3C4", "#E0B6A4", "#D29A84", "#C6836C", "#A84A2C"];

/** Five steps of blue for negative word scores, palest first. */
export const FILL_NEG: readonly string[] = ["#C8D6E9", "#A9BDD8", "#8DA6CA", "#7694BD", "#1F4E8F"];

/** The lesson's ink, for text. colors.scss's $ink holds the same value. */
export const INK_COLOR = "#1E242C";

/**
 * The stops of the signed legend gradient, from the negative end through white to the positive end.
 * colors.scss's $ramp-stops holds the same stops.
 */
export const RAMP_STOPS: readonly string[] = ["#1F4E8F", "#C8D6E9", "#FFFFFF", "#EFD3C4", "#A84A2C"];

/**
 * Colors for signed values: orange positive, blue negative. They are the darkest steps of the
 * ramps above. colors.scss holds the same values for stylesheets.
 */
export const POSITIVE_COLOR = FILL_POS[4];
export const NEGATIVE_COLOR = FILL_NEG[4];

/** The gray of rules and of muted marks. colors.scss's $rule holds the same value for stylesheets. */
export const RULE_COLOR = "#CCD3DD";

/** Zero counts as positive, as in the prototype. */
export function signColor(value: number): string {
  return value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
}

/** Maps a share of the maximum, from 0 to 1, to one of the five ramp steps. The cuts are lower bounds. */
export function rampLevel(t: number): 0 | 1 | 2 | 3 | 4 {
  if (t >= 0.75) return 4;
  if (t >= 0.5) return 3;
  if (t >= 0.3) return 2;
  if (t >= 0.12) return 1;
  return 0;
}

/**
 * The background and text colors for a word with a score. The caller is expected to call this
 * only for nonzero scores. A value past the maximum takes the darkest step.
 */
export function wordFill(value: number, max: number): { background: string; text: string } {
  const level = rampLevel(Math.min(1, Math.abs(value) / max));
  const background = (value >= 0 ? FILL_POS : FILL_NEG)[level];
  return { background, text: level === 4 ? "#FFFFFF" : INK_COLOR };
}
