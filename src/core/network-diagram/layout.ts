export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NetworkLayout {
  width: number;
  height: number;
  /** One radius for every node. */
  radius: number;
  /** The baseline of the column captions. */
  captionY: number;
  /** Each column's center x. */
  columnX: number[];
  /** [column][row]: node centers, top to bottom. */
  nodes: Point[][];
  /** One per node in the last column, top to bottom. */
  pills: Box[];
}

export const MIN_WIDTH = 380;
export const MIN_HEIGHT = 300;
/** The most space between neighboring nodes. */
const STEP_MAX = 30;
/** Room above the first node, for the captions. */
const TOP = 44;
/** Room below the last node. */
const BOTTOM = 14;
const PAD = 4;
/** About half the width of "Input Layer" in 12px Lato. The prototype measured it; jsdom can't. */
const FIRST_CAPTION_HALF = 30;
/** Room for "APPROACH", the wider output label, in 13px Barlow Condensed. */
const PILL_LABEL_WIDTH = 60;
const PILL_PAD_LEFT = 4;
/** From an output node's rim to its label. */
export const PILL_GAP = 7;
const PILL_PAD_RIGHT = 13;
/**
 * Room right of the pills. The winning pill pops to about 1.1 times its size about its center,
 * which takes its edge and stroke about 7 px further right, and the drawing mustn't spill out of
 * its scroller.
 */
const PILL_POP_ROOM = 7;
/** Between the two output pills: room for the caption over the lower one. */
const OUTPUT_CAPTION_GAP = 30;
/** The first column sits this far right of the even spread, so it doesn't look clipped. */
const FIRST_COLUMN_NUDGE = 10;

export function layoutNetwork(columnSizes: readonly number[], width: number, height: number): NetworkLayout {
  const W = Math.max(MIN_WIDTH, Math.round(width));
  const H = Math.max(MIN_HEIGHT, Math.round(height));
  const tallest = Math.max(...columnSizes);
  const columnHeight = (tallest - 1) * STEP_MAX + 24;
  // Height the columns can't use is split above and below them.
  const yShift = Math.round(Math.max(0, H - BOTTOM - TOP - columnHeight) / 2);
  const top = TOP + yShift;
  const bottom = H - BOTTOM - yShift;
  const tightest = tallest > 1 ? Math.min(STEP_MAX, (bottom - top) / (tallest - 1)) : STEP_MAX;
  const radius = Math.max(5, Math.min(12, Math.floor(tightest / 2) - 3));

  const last = columnSizes.length - 1;
  const leftGutter = Math.max(0, FIRST_CAPTION_HALF - radius);
  const rightGutter = PILL_GAP + PILL_LABEL_WIDTH + PILL_PAD_RIGHT;
  const xFirst = PAD + leftGutter + radius;
  const xLast = Math.max(xFirst + 60, W - PILL_POP_ROOM - rightGutter - radius);
  const columnX = columnSizes.map((_, i) =>
    xFirst + ((xLast - xFirst) * i) / last + (i === 0 ? FIRST_COLUMN_NUDGE : 0));

  const outputStep = radius * 2 + 8 + OUTPUT_CAPTION_GAP;
  const nodes = columnSizes.map((n, i) =>
    rowYs(n, top, bottom, i === last ? outputStep : STEP_MAX).map(y => ({ x: columnX[i], y })));

  const pillHeight = radius * 2 + 8;
  const pills = nodes[last].map(({ x, y }) => ({
    x: x - radius - PILL_PAD_LEFT,
    y: y - pillHeight / 2,
    width: PILL_PAD_LEFT + radius * 2 + PILL_GAP + PILL_LABEL_WIDTH + PILL_PAD_RIGHT,
    height: pillHeight,
  }));

  return { width: W, height: H, radius, captionY: 20 + yShift, columnX, nodes, pills };
}

/** n node centers, centered between top and bottom, at most maxStep apart. */
function rowYs(n: number, top: number, bottom: number, maxStep: number): number[] {
  const middle = (top + bottom) / 2;
  if (n === 1) {
    return [middle];
  }
  const step = Math.min(maxStep, (bottom - top) / (n - 1));
  const span = step * (n - 1);
  return Array.from({ length: n }, (_, i) => middle - span / 2 + i * step);
}
