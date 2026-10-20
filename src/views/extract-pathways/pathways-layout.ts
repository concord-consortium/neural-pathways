import { deckWidth } from "./deck-layout";
import type { ExtractGeometry } from "./extract-geometry";

// Where Extract Pathways draws its bars and boxes, after the prototype's PATH_LOAD, loadBars,
// buildBars, pathLayout and addPathwayBoxes. src/views/README.md says where the prototype is.

/** A fit's loadings, [neuron][pathway]: a row for each lifted neuron, PATHWAYS to a row. */
export type Loadings = readonly (readonly number[])[];

/** The view is drawn for three pathways: its boxes and its timing count on it. */
export const PATHWAYS = 3;
export const BAR_MAX = 44;
const BAR_MIN = 1.5;
export const BAR_HEIGHT = 6;
/** Between the three bars beside a neuron. */
export const BAR_PITCH = 7;
/** From the lifted column's edge to the start of the bars' track. */
const TRACK_GAP = 8;
/** From the half of the deck still showing to the lifted column's edge. */
const COLUMN_GAP = 100;
/** From the lifted column's center to the boxes' left edge. */
const BOX_GAP = 186;
export const BOX_SIDE = 34;
/** From a box's right edge to its label. */
export const LABEL_GAP = 10;

/** The largest |loading|, which draws BAR_MAX long. */
export function loadingMax(loadings: Loadings): number {
  return Math.max(...loadings.flat().map(Math.abs));
}

/** How long a loading's bar is: on one scale for the whole matrix, where `max` draws BAR_MAX, at least BAR_MIN. */
export function barLength(loading: number, max: number): number {
  return Math.max(BAR_MIN, (Math.abs(loading) / max) * BAR_MAX);
}

/** Every bar's length, neuron by neuron, PATHWAYS to a neuron. */
export function barLengths(loadings: Loadings): number[] {
  const max = loadingMax(loadings);
  return loadings.flatMap(row => row.map(loading => barLength(loading, max)));
}

/** One loading's bar: it grows from `zero`, right when positive and left when negative. */
export interface Bar {
  neuron: number;
  pathway: number;
  loading: number;
  length: number;
  zero: number;
  y: number;
}

/** A pathway's box: its left edge and its center's y. */
export interface PathwayBox {
  x: number;
  cy: number;
}

export interface PathwaysLayout {
  /** How far the lifted column moves to make room, in px; negative is left. */
  liftedDx: number;
  bars: Bar[];
  /** Each neuron's zero rule. */
  rules: { x: number; y1: number; y2: number }[];
  boxes: PathwayBox[];
}

/** Throws unless `loadings` has a row for each of `neurons` neurons, PATHWAYS to a row. */
export function checkLoadingsShape(loadings: Loadings, neurons: number): void {
  if (loadings.length !== neurons || loadings.some(row => row.length !== PATHWAYS)) {
    throw new Error(`Expected loadings for ${neurons} neurons on ${PATHWAYS} pathways, got `
      + `${loadings.length} rows of ${[...new Set(loadings.map(row => row.length))].join(", ")}`);
  }
}

/**
 * Where everything Extract Pathways adds goes, once the deck of `size` has slid half off the
 * canvas and the lifted column has followed it to COLUMN_GAP clear of what still shows. `loadings` has
 * a row for each of the lifted column's neurons, PATHWAYS to a row.
 */
export function pathwaysLayout(geometry: ExtractGeometry, size: number, loadings: Loadings): PathwaysLayout {
  const { lifted, deck } = geometry;
  checkLoadingsShape(loadings, lifted.ys.length);
  const shownRight = (deck.r * deckWidth(size)) / 2;
  const liftedDx = shownRight + COLUMN_GAP + lifted.r - lifted.x;
  const x = lifted.x + liftedDx;
  const zero = x + lifted.r + TRACK_GAP + BAR_MAX;
  const max = loadingMax(loadings);
  const bars = loadings.flatMap((row, neuron) => row.map((loading, pathway) => ({
    neuron, pathway, loading, length: barLength(loading, max), zero, y: lifted.ys[neuron] + (pathway - 1) * BAR_PITCH,
  })));
  const rules = lifted.ys.map(y => ({
    x: zero, y1: y - BAR_PITCH - BAR_HEIGHT / 2, y2: y + BAR_PITCH + BAR_HEIGHT / 2,
  }));
  const top = lifted.ys[0];
  const span = lifted.ys[lifted.ys.length - 1] - top;
  const boxes = Array.from({ length: PATHWAYS }, (_, p) => ({
    x: x + BOX_GAP, cy: Math.round(top + ((p + 1) * span) / (PATHWAYS + 1)),
  }));
  return { liftedDx, bars, rules, boxes };
}
