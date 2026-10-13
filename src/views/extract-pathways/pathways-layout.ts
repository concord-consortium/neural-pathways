import { deckWidth } from "./deck-layout";
import type { ExtractGeometry } from "./extract-geometry";

// Where Extract Pathways draws its bars and boxes, after the prototype's PATH_LOAD, loadBars,
// buildBars, pathLayout and addPathwayBoxes. src/views/README.md says where the prototype is.

/**
 * The prototype's stand-in loadings, [neuron][pathway]: Hidden Layer 1's 8 neurons, then Hidden
 * Layer 2's 6. They stay until the real network replaces them.
 */
export const LOADINGS: readonly (readonly number[])[] = [
  [0.525, -0.008, -0.267],
  [-0.370, 0.293, -0.116],
  [-0.135, -0.257, 0.343],
  [0.227, -0.249, 0.302],
  [-0.437, -0.177, -0.006],
  [-0.293, 0.176, 0.039],
  [0.318, 0.152, -0.238],
  [-0.567, -0.105, -0.135],
  [-0.564, -0.016, 0.051],
  [-0.081, -0.102, -0.045],
  [-0.585, -0.071, 0.274],
  [-0.132, -0.163, 0.222],
  [0.520, 0.215, 0.063],
  [0.373, -0.011, -0.141],
];
export const PATHWAYS = 3;
/** The largest |loading| in LOADINGS, which draws BAR_MAX long. */
const LOADING_MAX = 0.585;
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

/** How long a loading's bar is: on one scale for the whole matrix, never shorter than BAR_MIN. */
export function barLength(loading: number): number {
  return Math.max(BAR_MIN, (Math.abs(loading) / LOADING_MAX) * BAR_MAX);
}

/** Every bar's length, neuron by neuron, three to a neuron. */
export function barLengths(): number[] {
  return LOADINGS.flatMap(row => row.map(barLength));
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

/**
 * Where everything Extract Pathways adds goes, once the deck of `size` has slid half off the
 * canvas and the lifted column has followed it to COLUMN_GAP clear of what still shows.
 */
export function pathwaysLayout(geometry: ExtractGeometry, size: number): PathwaysLayout {
  const { lifted, deck } = geometry;
  const shownRight = (deck.r * deckWidth(size)) / 2;
  const liftedDx = shownRight + COLUMN_GAP + lifted.r - lifted.x;
  const x = lifted.x + liftedDx;
  const zero = x + lifted.r + TRACK_GAP + BAR_MAX;
  const bars = LOADINGS.flatMap((row, neuron) => row.map((loading, pathway) => ({
    neuron, pathway, loading, length: barLength(loading), zero, y: lifted.ys[neuron] + (pathway - 1) * BAR_PITCH,
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
