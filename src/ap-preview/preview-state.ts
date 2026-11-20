import {
  ApSettings, AspectRatioMethod, Column, FixedWidthLayout, SECTION_LAYOUTS, SectionLayout, isResponsive, isTwoColumn,
} from "./ap-sizing";

/** What the preview shows: a view, and the settings an author picks in LARA. */
export interface PreviewState extends ApSettings {
  viewId: string;
}

export interface Preset {
  id: string;
  label: string;
  settings: ApSettings;
}

// Every preset carries the designed native size, used only by MANUAL, so that switching a preset to
// MANUAL starts from it, and so the hash, which leaves it out for the other methods, reads back the
// same settings.
const designedNative = { nativeWidth: 1044, nativeHeight: 562 };
const fullWidth = { fixedWidthLayout: "1100px", layout: "full-width", column: "primary" } as const;

export const PRESETS: readonly Preset[] = [
  {
    id: "designed", label: "Full-width, manual 1044 × 562 (designed height)",
    settings: { ...fullWidth, aspectRatioMethod: "MANUAL", ...designedNative },
  },
  {
    id: "new-library-default", label: "Full-width, default aspect ratio (what a new library interactive gets)",
    settings: { ...fullWidth, aspectRatioMethod: "DEFAULT", ...designedNative },
  },
  {
    id: "max", label: "Full-width, use all available space",
    settings: { ...fullWidth, aspectRatioMethod: "MAX", ...designedNative },
  },
  {
    id: "responsive-manual", label: "Responsive full-width, manual 1044 × 562",
    settings: { ...fullWidth, layout: "responsive-full-width", aspectRatioMethod: "MANUAL", ...designedNative },
  },
  {
    id: "responsive-default", label: "Responsive full-width, default aspect ratio",
    settings: { ...fullWidth, layout: "responsive-full-width", aspectRatioMethod: "DEFAULT", ...designedNative },
  },
  {
    id: "ipad-manual", label: "iPad Friendly page, full-width, manual 1044 × 562",
    settings: { ...fullWidth, fixedWidthLayout: "ipad_friendly", aspectRatioMethod: "MANUAL", ...designedNative },
  },
  {
    id: "split-default", label: "60-40, interactive in primary column, default aspect ratio",
    settings: { ...fullWidth, layout: "60-40", aspectRatioMethod: "DEFAULT", ...designedNative },
  },
];

export const DEFAULT_SETTINGS: ApSettings = PRESETS[0].settings;

const FIXED_WIDTH_LAYOUTS: readonly FixedWidthLayout[] = ["1100px", "ipad_friendly"];
const COLUMNS: readonly Column[] = ["primary", "secondary"];
const ASPECT_RATIO_METHODS: readonly AspectRatioMethod[] = ["DEFAULT", "MANUAL", "MAX"];

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function positiveInteger(value: string | null, fallback: number): number {
  return value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : fallback;
}

/** Reads the hash field by field; a missing or unknown value falls back to the default preset's. */
export function parsePreviewHash(hash: string, viewIds: readonly string[]): PreviewState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const d = DEFAULT_SETTINGS;
  return {
    viewId: oneOf(params.get("view"), viewIds, viewIds[0]),
    fixedWidthLayout: oneOf(params.get("fixed_width_layout"), FIXED_WIDTH_LAYOUTS, d.fixedWidthLayout),
    layout: oneOf<SectionLayout>(params.get("layout"), SECTION_LAYOUTS, d.layout),
    column: oneOf(params.get("column"), COLUMNS, d.column),
    aspectRatioMethod: oneOf(params.get("aspect_ratio_method"), ASPECT_RATIO_METHODS, d.aspectRatioMethod),
    nativeWidth: positiveInteger(params.get("native_width"), d.nativeWidth),
    nativeHeight: positiveInteger(params.get("native_height"), d.nativeHeight),
  };
}

/** The hash for a state, named as the activity JSON names the settings, with only the ones that apply. */
export function formatPreviewHash(state: PreviewState): string {
  const params = new URLSearchParams({
    view: state.viewId, fixed_width_layout: state.fixedWidthLayout, layout: state.layout,
  });
  if (isTwoColumn(state.layout)) params.set("column", state.column);
  params.set("aspect_ratio_method", state.aspectRatioMethod);
  if (state.aspectRatioMethod === "MANUAL") {
    params.set("native_width", String(state.nativeWidth));
    params.set("native_height", String(state.nativeHeight));
  }
  return `#${params.toString()}`;
}

/** The preset these settings match, comparing only the fields that apply to them. */
export function matchingPreset(settings: ApSettings): Preset | undefined {
  return PRESETS.find(({ settings: p }) =>
    p.layout === settings.layout
    && (isResponsive(p.layout) || p.fixedWidthLayout === settings.fixedWidthLayout)
    && (!isTwoColumn(p.layout) || p.column === settings.column)
    && p.aspectRatioMethod === settings.aspectRatioMethod
    && (p.aspectRatioMethod !== "MANUAL"
      || (p.nativeWidth === settings.nativeWidth && p.nativeHeight === settings.nativeHeight)));
}
