// The size the Activity Player (AP) gives an Interactive's iframe, for the settings an author picks
// in LARA. It copies the AP's CSS and its use-aspect-ratio hook, so when the AP changes, this
// changes. References name the CSS selector, function or variable and its file, with the file's repo
// as a prefix: AP: for activity-player, as of 3a38f74d, and LARA: for LARA, as of 3499f294.
// measurements.md has the numbers it is checked against, and how they were measured.
//
// It assumes a Multiple Pages activity, and a managed interactive with a name, whose sizing it
// inherits from its library interactive.

// Each setting's values are listed once, in the order LARA lists them, and its type is taken from
// the list.

/** LARA's "Activity Page Fixed Width": `fixed_width_layout` in the activity JSON. */
export const FIXED_WIDTH_LAYOUTS = ["1100px", "ipad_friendly"] as const;
export type FixedWidthLayout = typeof FIXED_WIDTH_LAYOUTS[number];
/**
 * LARA's section "Layout": `layout` in the activity JSON (`layoutDisplayText` in
 * LARA:section-layout-utils.ts). The legacy layouts aren't offered.
 */
export const SECTION_LAYOUTS = [
  "full-width", "60-40", "40-60", "70-30", "30-70", "responsive-30-70", "responsive-50-50", "responsive-full-width",
] as const;
export type SectionLayout = typeof SECTION_LAYOUTS[number];
export const COLUMNS = ["primary", "secondary"] as const;
export type Column = typeof COLUMNS[number];
/** LARA's "Aspect Ratio": `aspect_ratio_method` in the activity JSON. */
export const ASPECT_RATIO_METHODS = ["DEFAULT", "MANUAL", "MAX"] as const;
export type AspectRatioMethod = typeof ASPECT_RATIO_METHODS[number];

export interface ApSettings {
  fixedWidthLayout: FixedWidthLayout;
  layout: SectionLayout;
  /** The column the interactive is in. Ignored for single-column layouts. */
  column: Column;
  aspectRatioMethod: AspectRatioMethod;
  /** `native_width` and `native_height`, used only by MANUAL. */
  nativeWidth: number;
  nativeHeight: number;
}

/** The AP's `#app` width (the window's, less a classic scrollbar) and `window.innerHeight`. */
export interface ApWindow { width: number; height: number }

export interface ApSize {
  responsivePage: boolean;
  /** 1100 or 960; null on a responsive page, which is as wide as the window. */
  pageWidth: number | null;
  /**
   * The primary column's width. A single-column layout's one column counts as primary. When the
   * interactive is in the secondary column, the preview uses this to draw the empty primary column.
   */
  primaryWidth: number;
  /**
   * The secondary column's width; null for single-column layouts. When the interactive is in the
   * primary column, the preview uses this to draw the empty secondary column.
   */
  secondaryWidth: number | null;
  /** The width of the interactive's column. */
  columnWidth: number;
  iframeWidth: number;
  iframeHeight: number;
  /** The iframe with the title bar and the border around it, and the space below it. */
  interactiveHeight: number;
  /**
   * How the width and the height were worked out, one line each, and a line when the interactive is
   * taller than the window: the Activity Player caps only the iframe's height.
   */
  explanation: string[];
  warning: string | null;
}

// LARA's default native size (`ASPECT_RATIO_DEFAULT_WIDTH` and `_HEIGHT` in
// LARA:has_aspect_ratio.rb), used when the native size can't be divided by.
const DEFAULT_NATIVE_WIDTH = 576;
const DEFAULT_NATIVE_HEIGHT = 435;
// `kDefaultAspectRatio` and `kBottomMargin` in AP:use-aspect-ratio.ts, and `kDefaultHeight` in
// AP:iframe-runtime.tsx.
const DEFAULT_ASPECT_RATIO = 4 / 3;
const BOTTOM_MARGIN = 15;
const DEFAULT_IFRAME_HEIGHT = 300;
// Under the iframe, the margins of the div that holds "Clear & start over" and teacher feedback, when
// there are any (`.iframe-runtime-buttons` in AP:iframe-runtime.scss and AP:iframe-runtime.tsx); the
// title bar (`.embeddable .header` in AP:embeddable.scss); a managed interactive's 1 px border, top
// and bottom (`.runtime-container.has-border` in AP:managed-interactive.scss).
const BELOW_IFRAME_HEIGHT = 30;
const HEADER_HEIGHT = 36;
const BORDER = 2;

export function isResponsive(layout: SectionLayout): boolean {
  return layout.includes("responsive");
}

export function isTwoColumn(layout: SectionLayout): boolean {
  return layout !== "full-width" && layout !== "responsive-full-width";
}

/** True where LARA's label says "primary on left". The responsive layouts put it on the right. */
export function primaryOnLeft(layout: SectionLayout): boolean {
  return layout === "60-40" || layout === "70-30";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

interface Columns { pageWidth: number | null; primary: number; secondary: number | null; why: string }

function columnWidths(settings: ApSettings, windowWidth: number): Columns {
  const { layout } = settings;
  const W = windowWidth;
  if (isResponsive(layout)) {
    // The page is the window less the `.app`'s 40 px padding each side (AP:app.scss) and the page's
    // 20 px each side (`.page-content` in AP:activity-page-content.scss). The section is 100% of
    // that; its 8 px margin overflows instead of narrowing it (`.section` and `.section.responsive`
    // in AP:section.scss).
    const section = W - 120;
    if (layout === "responsive-full-width") {
      // The embeddable's 20 px right margin (`.section.responsive .embeddable.full-width > div` in
      // AP:section.scss).
      return { pageWidth: null, primary: section - 20, secondary: null, why: `the ${W} px window less 140 px` };
    }
    if (layout === "responsive-30-70") {
      // A 365 px secondary column, a 10 px gap, and the primary's 20 px right margin
      // (`.section.responsive .column.primary` and `.column.secondary` in AP:section.scss).
      return {
        pageWidth: null, primary: section - 365 - 10 - 20, secondary: 365,
        why: settings.column === "primary" ? `the ${W} px window less 515 px` : "the secondary column's fixed 365 px",
      };
    }
    // responsive-50-50: each column 50% of the section; the primary loses the 10 px gap and its 20 px
    // right margin (the `.responsive-50-50` columns under `.section.responsive` in AP:section.scss).
    const half = section / 2;
    return {
      pageWidth: null, primary: half - 30, secondary: half,
      why: `the ${W} px window less 120, halved` + (settings.column === "primary" ? ", less 30" : ""),
    };
  }

  // A fixed page: its padding (`.page-content`) and the section's margin (`.section`) take 56 px. The
  // `.app`'s padding sits outside the page, so the window's width doesn't matter.
  const pageWidth = settings.fixedWidthLayout === "ipad_friendly" ? 960 : 1100;
  const C = pageWidth - 56;
  const page = `the ${pageWidth} px page`;
  if (layout === "full-width") {
    return { pageWidth, primary: C, secondary: null, why: `${page} less 56 px of padding and margin` };
  }
  if (layout === "60-40" || layout === "70-30") {
    // 10 equal columns with 10 px gaps (`.section` in AP:section.scss); the primary spans 6 or 7.
    const span = (n: number) => n * (C - 90) / 10 + 10 * (n - 1);
    const primarySpan = layout === "60-40" ? 6 : 7;
    return {
      pageWidth, primary: span(primarySpan), secondary: span(10 - primarySpan), why: `the ${layout} grid on ${page}`,
    };
  }
  // 40-60 and 30-70: minmax(45px, auto) then 9 × 1fr, with 10 px gaps (`.section.r_4060` and
  // `.section.r_3070` in AP:section.scss). The secondary's span includes the 45 px track.
  const fr = (C - 135) / 9;
  const p = layout === "40-60" ? 6 : 7;
  const s = 10 - p;
  return {
    pageWidth, primary: p * fr + 10 * (p - 1), secondary: 45 + (s - 1) * fr + 10 * (s - 1),
    why: `the ${layout} grid on ${page}`,
  };
}

const STAYS_300 = "so the iframe stays at its 300 px default.";
const MAX_WARNINGS = {
  secondary: `The Activity Player doesn't apply "Use all available space" in a secondary column, ${STAYS_300}`,
  responsiveFullWidth: `The Activity Player doesn't apply "Use all available space" in a responsive-full-width ` +
    `section, ${STAYS_300}`,
  primary: `The Activity Player applies "Use all available space" in a primary column only when the embed sets it ` +
    `with Customize, not when it comes from the library interactive, ${STAYS_300}`,
};

export function apSize(settings: ApSettings, window: ApWindow): ApSize {
  const cols = columnWidths(settings, window.width);
  const twoColumn = isTwoColumn(settings.layout);
  const column: Column = twoColumn ? settings.column : "primary";
  const primaryWidth = Math.max(0, cols.primary);
  const secondaryWidth = cols.secondary === null ? null : Math.max(0, cols.secondary);
  const D = column === "primary" ? primaryWidth : secondaryWidth ?? 0;

  let iframeWidth = D;
  let iframeHeight: number;
  let heightWhy: string;
  let warning: string | null = null;
  // `maxHeight` and `unusableHeight` in AP:use-aspect-ratio.ts. The header and delete-data terms in
  // `unusableHeight` are always 0: AP:managed-interactive.tsx never attaches `headerTarget` to an
  // element, and passes `showDeleteDataButton: false`. That leaves the bottom margin.
  const M = 0.98 * window.height;

  if (settings.aspectRatioMethod === "MANUAL") {
    // The MANUAL case in AP:use-aspect-ratio.ts: the native ratio of the width, with no cap.
    const valid = settings.nativeWidth > 0 && settings.nativeHeight > 0;
    const nw = valid ? settings.nativeWidth : DEFAULT_NATIVE_WIDTH;
    const nh = valid ? settings.nativeHeight : DEFAULT_NATIVE_HEIGHT;
    iframeHeight = D * nh / nw;
    heightWhy = `Height ${round1(iframeHeight)}: the width × ${nh} / ${nw}, with no cap.`;
  } else if (settings.aspectRatioMethod === "DEFAULT") {
    // The DEFAULT case in AP:use-aspect-ratio.ts. The app doesn't use the interactive API, so the ratio
    // is 4:3.
    if (D / DEFAULT_ASPECT_RATIO <= M - BOTTOM_MARGIN) {
      iframeHeight = D / DEFAULT_ASPECT_RATIO;
      heightWhy = `Height ${round1(iframeHeight)}: 3/4 of the width.`;
    } else {
      iframeHeight = M - BOTTOM_MARGIN;
      // The width is narrowed from M, not M − 15.
      iframeWidth = Math.min(D, M * DEFAULT_ASPECT_RATIO);
      heightWhy = `Height ${round1(iframeHeight)}: capped at 98% of the ${window.height} px window less 15.` +
        (iframeWidth < D ? ` Width narrowed to 98% of ${window.height} × 4/3.` : "");
    }
  } else {
    // MAX: the iframe keeps its 300 px height attribute unless CSS stretches it to 98vh, in a
    // full-width section (`.section.full-width .embeddable.full-width.max-aspect-ratio` in
    // AP:section.scss, `hasMaxAspectRatio` in AP:embeddable.tsx) or a primary column whose embed sets
    // MAX itself (`.column.primary.max-aspect-ratio` in AP:section.scss, `renderPrimaryEmbeddables` in
    // AP:section.tsx).
    if (settings.layout === "full-width") {
      iframeHeight = M - BELOW_IFRAME_HEIGHT - HEADER_HEIGHT - BORDER;
      heightWhy = `Height ${round1(iframeHeight)}: 98% of the ${window.height} px window, less 36 for the title bar, ` +
        "2 for the border and 30 for the space below it.";
    } else {
      iframeHeight = DEFAULT_IFRAME_HEIGHT;
      heightWhy = "Height 300: the iframe's default.";
      warning = column === "secondary" ? MAX_WARNINGS.secondary
        : settings.layout === "responsive-full-width" ? MAX_WARNINGS.responsiveFullWidth
        : MAX_WARNINGS.primary;
    }
  }

  iframeHeight = Math.max(0, iframeHeight);
  const interactiveHeight = iframeHeight + HEADER_HEIGHT + BORDER + BELOW_IFRAME_HEIGHT;
  const explanation = [`Column width ${round1(D)}: ${cols.why}.`, heightWhy];
  if (interactiveHeight > window.height) {
    explanation.push("With its title bar, border and the space below it, the interactive is " +
      `${round1(interactiveHeight)} px tall, taller than the ${window.height} px window.`);
  }

  return {
    responsivePage: isResponsive(settings.layout),
    pageWidth: cols.pageWidth,
    primaryWidth,
    secondaryWidth,
    columnWidth: D,
    iframeWidth: Math.max(0, iframeWidth),
    iframeHeight,
    interactiveHeight,
    explanation,
    warning,
  };
}
