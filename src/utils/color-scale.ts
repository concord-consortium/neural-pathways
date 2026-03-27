export type ScaleType = "blue-gray-red" | "blue-white-red" | "size-based";

export interface PointStyle {
  color: string;
  radiusScale: number; // multiplier on the base radius (0 to 1)
}

const BLUE = { r: 50, g: 100, b: 220 };
const RED = { r: 220, g: 50, b: 50 };

/**
 * Given a data value and scale type, return the fill color and radius scale for a heatmap point.
 */
export function getPointStyle(value: number, absMax: number, scaleType: ScaleType): PointStyle {
  if (absMax === 0) return { color: "rgb(180,180,180)", radiusScale: 1 };

  const clamped = Math.max(-absMax, Math.min(absMax, value));
  const normalized = clamped / absMax; // range [-1, 1]
  const t = Math.abs(normalized);

  switch (scaleType) {
    case "blue-gray-red": {
      const gray = 180;
      const target = normalized < 0 ? BLUE : RED;
      const r = Math.round(gray * (1 - t) + target.r * t);
      const g = Math.round(gray * (1 - t) + target.g * t);
      const b = Math.round(gray * (1 - t) + target.b * t);
      return { color: `rgb(${r},${g},${b})`, radiusScale: 1 };
    }
    case "blue-white-red": {
      const target = normalized < 0 ? BLUE : RED;
      const r = Math.round(255 * (1 - t) + target.r * t);
      const g = Math.round(255 * (1 - t) + target.g * t);
      const b = Math.round(255 * (1 - t) + target.b * t);
      return { color: `rgb(${r},${g},${b})`, radiusScale: 1 };
    }
    case "size-based": {
      const color = normalized < 0 ? `rgb(${BLUE.r},${BLUE.g},${BLUE.b})` : `rgb(${RED.r},${RED.g},${RED.b})`;
      return { color, radiusScale: t };
    }
  }
}

/**
 * Legacy helper — returns just a color string for the blue-gray-red scale.
 */
export function valueToColor(value: number, absMax: number): string {
  return getPointStyle(value, absMax, "blue-gray-red").color;
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
