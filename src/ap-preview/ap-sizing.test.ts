import { ApSettings, apSize } from "./ap-sizing";

// Measured in the deployed Activity Player, or computed from its CSS where marked in the design doc.
const base: ApSettings = {
  fixedWidthLayout: "1100px",
  layout: "full-width",
  column: "primary",
  aspectRatioMethod: "DEFAULT",
  nativeWidth: 576,
  nativeHeight: 435,
};
const tall = { width: 1400, height: 2000 };

function columns(settings: Partial<ApSettings>, window = tall) {
  const size = apSize({ ...base, ...settings }, window);
  return [size.primaryWidth, size.secondaryWidth];
}

describe("apSize", () => {
  it("sizes a full-width section on each fixed page, whatever the window's width", () => {
    for (const width of [500, 3000]) {
      expect(apSize({ ...base }, { width, height: 2000 }).columnWidth).toBeCloseTo(1044, 1);
      expect(apSize({ ...base, fixedWidthLayout: "ipad_friendly" }, { width, height: 2000 }).columnWidth)
        .toBeCloseTo(904, 1);
    }
    const size = apSize(base, tall);
    expect(size.responsivePage).toBe(false);
    expect(size.pageWidth).toBe(1100);
    expect(size.secondaryWidth).toBeNull();
  });

  it("sizes the columns of each two-column layout on the 1100 page", () => {
    const expected: [ApSettings["layout"], number, number][] = [
      ["60-40", 622.4, 411.6], ["70-30", 727.8, 306.2], ["40-60", 656, 378], ["30-70", 767, 267],
    ];
    for (const [layout, primary, secondary] of expected) {
      const [p, s] = columns({ layout });
      expect(p).toBeCloseTo(primary, 1);
      expect(s).toBeCloseTo(secondary, 1);
    }
  });

  it("sizes the columns of each two-column layout on the iPad Friendly page", () => {
    const expected: [ApSettings["layout"], number, number][] = [
      ["60-40", 538.4, 355.6], ["70-30", 629.8, 264.2], ["40-60", 562.7, 331.3], ["30-70", 658.1, 235.9],
    ];
    for (const [layout, primary, secondary] of expected) {
      const [p, s] = columns({ layout, fixedWidthLayout: "ipad_friendly" });
      expect(p).toBeCloseTo(primary, 1);
      expect(s).toBeCloseTo(secondary, 1);
    }
  });

  it("sizes responsive layouts from the window's width", () => {
    const window = { width: 1366, height: 2000 };
    expect(columns({ layout: "responsive-full-width" }, window)[0]).toBeCloseTo(1226, 1);
    expect(columns({ layout: "responsive-30-70" }, window)).toEqual([851, 365]);
    expect(columns({ layout: "responsive-50-50" }, window)).toEqual([593, 623]);
    const size = apSize({ ...base, layout: "responsive-full-width" }, window);
    expect(size.responsivePage).toBe(true);
    expect(size.pageWidth).toBeNull();
  });

  it("clamps widths at zero in a window too narrow for the layout", () => {
    const size = apSize({ ...base, layout: "responsive-30-70" }, { width: 400, height: 800 });
    expect(size.primaryWidth).toBe(0);
    for (const n of [size.primaryWidth, size.secondaryWidth, size.columnWidth, size.iframeWidth, size.iframeHeight]) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses the column the interactive is in", () => {
    const size = apSize({ ...base, layout: "60-40", column: "secondary" }, tall);
    expect(size.columnWidth).toBeCloseTo(411.6, 1);
    expect(size.iframeWidth).toBeCloseTo(411.6, 1);
  });

  it("ignores the column in a single-column layout", () => {
    expect(apSize({ ...base, column: "secondary" }, tall).columnWidth).toBeCloseTo(1044, 1);
  });

  it("default: 4:3 of the width when it fits the window", () => {
    const size = apSize(base, { width: 1400, height: 1200 });
    expect(size.iframeWidth).toBeCloseTo(1044, 1);
    expect(size.iframeHeight).toBeCloseTo(783, 1);
    expect(size.warning).toBeNull();
  });

  it("default: caps the height and narrows the width in a short window", () => {
    const size = apSize(base, { width: 1400, height: 600 });
    expect(size.iframeWidth).toBeCloseTo(784, 1);
    expect(size.iframeHeight).toBeCloseTo(573, 1);
  });

  it("default: caps the height but keeps the width when 98% of the height × 4/3 is wider", () => {
    const size = apSize(base, { width: 1400, height: 800 });
    expect(size.iframeWidth).toBeCloseTo(1044, 1);
    expect(size.iframeHeight).toBeCloseTo(769, 1);
  });

  it("manual: the native ratio of the width, with no cap", () => {
    const manual: ApSettings = { ...base, aspectRatioMethod: "MANUAL", nativeWidth: 1044, nativeHeight: 562 };
    const short = apSize(manual, { width: 1400, height: 400 });
    expect(short.iframeWidth).toBeCloseTo(1044, 1);
    expect(short.iframeHeight).toBeCloseTo(562, 1);
    const responsive = apSize({ ...manual, layout: "responsive-full-width" }, { width: 1366, height: 400 });
    expect(responsive.iframeWidth).toBeCloseTo(1226, 1);
    expect(responsive.iframeHeight).toBeCloseTo(660, 0);
  });

  it("all available space: 98% of the window less the buttons, bar and border, in a full-width section", () => {
    const size = apSize({ ...base, aspectRatioMethod: "MAX" }, { width: 1400, height: 900 });
    expect(size.iframeHeight).toBeCloseTo(814, 1);
    expect(size.warning).toBeNull();
  });

  it("all available space falls back to 300 px where the Activity Player doesn't stretch it", () => {
    const window = { width: 1400, height: 900 };
    const secondary = apSize({ ...base, aspectRatioMethod: "MAX", layout: "60-40", column: "secondary" }, window);
    expect(secondary.iframeHeight).toBe(300);
    expect(secondary.warning).toMatch(/secondary column/);
    const responsive = apSize({ ...base, aspectRatioMethod: "MAX", layout: "responsive-full-width" }, window);
    expect(responsive.iframeHeight).toBe(300);
    expect(responsive.warning).toMatch(/responsive-full-width/);
    // A primary column stretches only for an embed set to MAX with Customize, not one that inherits
    // MAX from its library interactive, which is what the preview models.
    for (const layout of ["60-40", "responsive-30-70"] as const) {
      const primary = apSize({ ...base, aspectRatioMethod: "MAX", layout }, window);
      expect(primary.iframeHeight).toBe(300);
      expect(primary.warning).toMatch(/library interactive/);
    }
  });

  it("never returns a non-finite size, even for a zero native size", () => {
    const size = apSize({ ...base, aspectRatioMethod: "MANUAL", nativeWidth: 0, nativeHeight: 0 }, tall);
    expect(Number.isFinite(size.iframeWidth)).toBe(true);
    expect(Number.isFinite(size.iframeHeight)).toBe(true);
    expect(size.iframeHeight).toBeCloseTo(1044 * 435 / 576, 1);
  });

  it("explains each number", () => {
    const size = apSize(base, { width: 1400, height: 600 });
    expect(size.explanation).toHaveLength(2);
    expect(size.explanation[0]).toMatch(/1044/);
    expect(size.explanation[1]).toMatch(/600/);
  });
});
