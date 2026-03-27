/**
 * Convert a value to an RGB color on a blue→gray→red diverging scale.
 * Negative values map to blue (cold), zero to gray, positive to red (hot).
 *
 * @param value - The data value
 * @param absMax - The symmetric range bound (values are clamped to [-absMax, absMax])
 * @returns An "rgb(r,g,b)" CSS color string
 */
export function valueToColor(value: number, absMax: number): string {
  if (absMax === 0) return "rgb(180,180,180)";

  const clamped = Math.max(-absMax, Math.min(absMax, value));
  const normalized = clamped / absMax; // range [-1, 1]

  // Gray midpoint
  const gray = 180;

  if (normalized < 0) {
    // gray → blue
    const t = Math.abs(normalized);
    const r = Math.round(gray * (1 - t) + 50 * t);
    const g = Math.round(gray * (1 - t) + 100 * t);
    const b = Math.round(gray * (1 - t) + 220 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // gray → red
    const t = normalized;
    const r = Math.round(gray * (1 - t) + 220 * t);
    const g = Math.round(gray * (1 - t) + 50 * t);
    const b = Math.round(gray * (1 - t) + 50 * t);
    return `rgb(${r},${g},${b})`;
  }
}

/**
 * Find the symmetric absolute max across one or more arrays of numbers.
 */
export function computeAbsMax(...arrays: number[][]): number {
  let max = 0;
  for (const arr of arrays) {
    for (const v of arr) {
      const abs = Math.abs(v);
      if (abs > max) max = abs;
    }
  }
  return max;
}
