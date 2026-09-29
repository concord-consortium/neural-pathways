import { clamp01, cubicBezier, ease } from "./easing";

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

  it("rises steadily for the edge curve", () => {
    const curve = cubicBezier(0.3, 0.05, 0.4, 1);
    let previous = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(curve(t)).toBeGreaterThanOrEqual(previous);
      previous = curve(t);
    }
  });
});
