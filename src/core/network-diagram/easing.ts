export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * A CSS-style cubic Bézier timing function through (0, 0), (x1, y1), (x2, y2), (1, 1). Returns
 * the eased progress for a linear progress `t`. It is 0 for any `t` at or below 0 and 1 at or above
 * 1. In between it is not clamped: it overshoots 1 when y1 or y2 is above 1.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  // The curve parameter s whose x is `x`: Newton's method, then bisection if it stalls.
  function solveX(x: number): number {
    let s = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(s) - x;
      if (Math.abs(error) < 1e-7) {
        return s;
      }
      const slope = slopeX(s);
      if (Math.abs(slope) < 1e-7) {
        break;
      }
      s -= error / slope;
    }
    let low = 0;
    let high = 1;
    s = x;
    while (high - low > 1e-7) {
      const value = sampleX(s);
      if (Math.abs(value - x) < 1e-7) {
        return s;
      }
      if (x > value) {
        low = s;
      } else {
        high = s;
      }
      s = (low + high) / 2;
    }
    return s;
  }

  return (t: number) => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    return sampleY(solveX(t));
  };
}

/** CSS's `ease`, which the prototype's gauge transitions used. */
export const ease = cubicBezier(0.25, 0.1, 0.25, 1);
