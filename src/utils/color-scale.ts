export type ScaleType = "blue-gray-red" | "blue-white-red" | "multi-hue" | "size-based";
export type ValueScaling = "linear" | "exponential" | "logarithmic";

/**
 * Apply a nonlinear scaling to a normalized value in [-1, 1].
 * Preserves the sign; transforms the magnitude.
 */
function applyScaling(normalized: number, scaling: ValueScaling): number {
  if (scaling === "linear") return normalized;

  const sign = normalized < 0 ? -1 : 1;
  const t = Math.abs(normalized);

  if (scaling === "exponential") {
    // Power curve — compresses small values, emphasizes large
    return sign * t * t;
  }
  // Logarithmic — emphasizes small values, compresses large
  // log(1 + t*k) / log(1 + k), with k controlling the curve strength
  const k = 9;
  return sign * Math.log(1 + t * k) / Math.log(1 + k);
}

export interface PointStyle {
  color: string;
  radiusScale: number; // multiplier on the base radius (0 to 1)
}

const BLUE = { r: 50, g: 100, b: 220 };
const RED = { r: 220, g: 50, b: 50 };

// Multi-hue stops: blue → cyan → white → yellow → red
// Mapped to normalized values: -1, -0.5, 0, 0.5, 1
const MULTI_HUE_STOPS = [
  { pos: -1.0, r: 50,  g: 80,  b: 220 }, // blue
  { pos: -0.5, r: 80,  g: 200, b: 220 }, // cyan
  { pos:  0.0, r: 255, g: 255, b: 255 }, // white
  { pos:  0.5, r: 240, g: 210, b: 50  }, // yellow
  { pos:  1.0, r: 220, g: 50,  b: 50  }, // red
];

function interpolateMultiHue(normalized: number): string {
  const stops = MULTI_HUE_STOPS;
  // Find the two stops to interpolate between
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (normalized >= stops[i].pos && normalized <= stops[i + 1].pos) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = (normalized - lo.pos) / (hi.pos - lo.pos);
  const r = Math.round(lo.r + (hi.r - lo.r) * t);
  const g = Math.round(lo.g + (hi.g - lo.g) * t);
  const b = Math.round(lo.b + (hi.b - lo.b) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Given a data value and scale type, return the fill color and radius scale for a heatmap point.
 */
export function getPointStyle(
  value: number, absMax: number, scaleType: ScaleType, scaling: ValueScaling = "linear"
): PointStyle {
  if (absMax === 0) return { color: "rgb(180,180,180)", radiusScale: 1 };

  const clamped = Math.max(-absMax, Math.min(absMax, value));
  const raw = clamped / absMax; // range [-1, 1]
  const normalized = applyScaling(raw, scaling);
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
    case "multi-hue": {
      return { color: interpolateMultiHue(normalized), radiusScale: 1 };
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
