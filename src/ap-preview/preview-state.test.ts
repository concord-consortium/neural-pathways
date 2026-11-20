import {
  DEFAULT_SETTINGS, PRESETS, PreviewState, formatPreviewHash, matchingPreset, parsePreviewHash,
} from "./preview-state";

const ids = ["looking-inside", "extract-pathways", "correlations"];
const preset = (id: string) => PRESETS.find(p => p.id === id)!.settings;

describe("the preview's hash", () => {
  it("round-trips a state through the hash", () => {
    for (const p of PRESETS) {
      const state: PreviewState = { viewId: "correlations", ...p.settings };
      expect(parsePreviewHash(formatPreviewHash(state), ids)).toEqual(state);
    }
  });

  it("writes the activity JSON's names, and only the fields that apply", () => {
    expect(formatPreviewHash({ viewId: "looking-inside", ...preset("designed") })).toBe(
      "#view=looking-inside&fixed_width_layout=1100px&layout=full-width" +
      "&aspect_ratio_method=MANUAL&native_width=1044&native_height=562");
    expect(formatPreviewHash({ viewId: "looking-inside", ...preset("new-library-default") })).toBe(
      "#view=looking-inside&fixed_width_layout=1100px&layout=full-width&aspect_ratio_method=DEFAULT");
    expect(formatPreviewHash({ viewId: "looking-inside", ...preset("split-default") })).toBe(
      "#view=looking-inside&fixed_width_layout=1100px&layout=60-40&column=primary&aspect_ratio_method=DEFAULT");
  });

  it("falls back to the first view and the default settings for an empty hash", () => {
    expect(parsePreviewHash("", ids)).toEqual({ viewId: "looking-inside", ...DEFAULT_SETTINGS });
  });

  it("falls back to the defaults field by field", () => {
    const state = parsePreviewHash("#view=nope&layout=60-40&column=secondary", ids);
    expect(state.viewId).toBe("looking-inside");
    expect(state.layout).toBe("60-40");
    expect(state.column).toBe("secondary");
    for (const legacy of ["responsive", "responsive-2-column"]) {
      expect(parsePreviewHash(`#layout=${legacy}`, ids).layout).toBe("full-width");
    }
    expect(parsePreviewHash("#aspect_ratio_method=max", ids).aspectRatioMethod).toBe(DEFAULT_SETTINGS.aspectRatioMethod);
    expect(parsePreviewHash("#fixed_width_layout=960px", ids).fixedWidthLayout).toBe("1100px");
    expect(parsePreviewHash("#column=middle", ids).column).toBe("primary");
    for (const bad of ["0", "-5", "abc", "12.5", ""]) {
      expect(parsePreviewHash(`#aspect_ratio_method=MANUAL&native_width=${bad}`, ids).nativeWidth).toBe(1044);
    }
  });
});

describe("matchingPreset", () => {
  it("matches a preset only when every field that applies matches", () => {
    expect(matchingPreset(preset("designed"))?.id).toBe("designed");
    expect(matchingPreset({ ...preset("designed"), nativeHeight: 563 })).toBeUndefined();
    expect(matchingPreset({ ...preset("split-default"), column: "secondary" })).toBeUndefined();
  });

  it("ignores the fields that don't apply to the settings", () => {
    // The native size matters only for MANUAL, and the column only for two-column layouts.
    expect(matchingPreset({ ...preset("new-library-default"), nativeWidth: 800, nativeHeight: 600 })?.id)
      .toBe("new-library-default");
    expect(matchingPreset({ ...preset("designed"), column: "secondary" })?.id).toBe("designed");
    // A responsive section makes the page full width, so the fixed width doesn't apply.
    expect(matchingPreset({ ...preset("responsive-default"), fixedWidthLayout: "ipad_friendly" })?.id)
      .toBe("responsive-default");
  });
});
