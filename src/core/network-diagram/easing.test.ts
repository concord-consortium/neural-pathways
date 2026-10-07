import { clamp01, cubicBezier, ease } from "./easing";

/** The curve's y where its x is `t`, found by bisection on the Bézier polynomials directly. */
function referenceBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const at = (s: number, p1: number, p2: number) => 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s ** 2 * p2 + s ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (at(middle, x1, x2) < t) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return at((low + high) / 2, y1, y2);
}

describe("clamp01", () => {
  it("keeps values between 0 and 1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(Infinity)).toBe(1);
  });
});

describe("cubicBezier", () => {
  it("is the identity for a straight curve", () => {
    const linear = cubicBezier(0, 0, 1, 1);
    for (const t of [0.1, 0.25, 0.5, 0.9]) {
      expect(linear(t)).toBeCloseTo(t, 5);
    }
  });

  it("starts at 0, ends at 1 and clamps outside them", () => {
    const curve = cubicBezier(0.3, 0.05, 0.4, 1);
    expect(curve(0)).toBe(0);
    expect(curve(1)).toBe(1);
    expect(curve(-1)).toBe(0);
    expect(curve(2)).toBe(1);
  });

  it("matches CSS ease at the midpoint", () => {
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
  });

  it.each([
    ["CSS ease", [0.25, 0.1, 0.25, 1]],
    // x flattens out mid-curve, where Newton's method stalls and bisection takes over.
    ["a curve with a flat stretch in x", [1, 0, 0, 1]],
  ] as const)("matches a direct solve of %s", (_, [x1, y1, x2, y2]) => {
    const curve = cubicBezier(x1, y1, x2, y2);
    for (let t = 0.01; t < 1; t += 0.01) {
      expect(curve(t)).toBeCloseTo(referenceBezier(x1, y1, x2, y2, t), 4);
    }
  });

  it("never falls when y1 and y2 are between 0 and 1", () => {
    const curve = cubicBezier(0.3, 0.05, 0.4, 1);
    let previous = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(curve(t)).toBeGreaterThanOrEqual(previous);
      previous = curve(t);
    }
  });
});
