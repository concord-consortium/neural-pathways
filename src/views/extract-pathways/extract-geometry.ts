import { layoutNetwork, NetworkLayout, Point } from "../../core/network-diagram/layout";

export const CANVAS_HEIGHT = 440;
/**
 * The prototype's width once it lifts its 537 cap: the network plus a 229 strip each side. A
 * narrower panel scales this layout down rather than squeezing the strips.
 */
export const MIN_CANVAS_WIDTH = 995;
export const NETWORK_WIDTH = 537;
/** The baseline of "Conversation n" and "Hidden Layer Neurons". */
export const LABEL_Y = 22;
/** The deck's radius leaves room for this many columns, as the prototype's does. */
export const DECK_COLUMNS = 20;

// The lifted column (the prototype's liftGeom): a band for its label, then up to 28 apart.
const LIFT_BAND = 30;
const LIFT_PAD = 6;
const LIFT_PITCH = 28;
const LIFT_PAD_BOTTOM = 10;
// The deck (STACK_R and colRowY): a band above, a little clear below the deepest column.
const DECK_BAND = 34;
const DECK_PAD_TOP = 2;
const DECK_PAD_BOTTOM = 10;
/** With DECK_COLUMNS, what the prototype divides the height by to size the deck. */
const DECK_ROWS_EXTRA = 27;

/** A column of the 14 copies: its center x, each row's y, and the radius. */
export interface ColumnGeometry {
  x: number;
  ys: number[];
  r: number;
}

export interface ExtractGeometry {
  width: number;
  height: number;
  /** The x where the network's layout starts. */
  networkX: number;
  network: NetworkLayout;
  /** The hidden nodes in canvas coordinates: Hidden Layer 1's, then Hidden Layer 2's. */
  hidden: Point[];
  lifted: ColumnGeometry;
  /** The deck's first column. Column c sits c radii left of it and c radii down. */
  deck: ColumnGeometry;
}

/** The canvas laid out for a host `hostWidth` wide. */
export function extractGeometry(columnSizes: readonly number[], hostWidth: number): ExtractGeometry {
  const width = Math.max(MIN_CANVAS_WIDTH, Math.round(hostWidth));
  const height = CANVAS_HEIGHT;
  const network = layoutNetwork(columnSizes, NETWORK_WIDTH, height);
  const networkX = Math.round((width - NETWORK_WIDTH) / 2);
  const hidden = network.nodes.slice(1, -1).flat().map(({ x, y }) => ({ x: x + networkX, y }));
  const count = hidden.length;
  const R = network.radius;

  const room = height - LIFT_BAND;
  const pitch = Math.min(LIFT_PITCH, (room - 2 * (R + LIFT_PAD)) / (count - 1));
  const liftedR = R * (pitch / LIFT_PITCH);
  const top = LIFT_BAND + Math.round((room - (count - 1) * pitch) / 2);
  const lastY = height - LIFT_PAD_BOTTOM - liftedR;
  const shut = Math.min(pitch, (lastY - top) / (count - 1));
  const lifted = {
    x: Math.round((networkX + NETWORK_WIDTH + width) / 2),
    ys: Array.from({ length: count }, (_, k) => top + k * shut),
    r: liftedR,
  };

  const deckR = Math.min(R,
    Math.floor(((height - DECK_BAND - DECK_PAD_TOP - DECK_PAD_BOTTOM) / (DECK_COLUMNS + DECK_ROWS_EXTRA)) * 10) / 10);
  const deckTop = DECK_BAND + deckR + DECK_PAD_TOP;
  const deckBottom = height - DECK_PAD_BOTTOM - deckR - deckR * (DECK_COLUMNS - 1);
  const deckStep = (deckBottom - deckTop) / (count - 1);
  const deck = {
    x: Math.round(networkX / 2),
    ys: Array.from({ length: count }, (_, k) => deckTop + k * deckStep),
    r: deckR,
  };

  return { width, height, networkX, network, hidden, lifted, deck };
}

/** Where row `row` of deck column `column` sits: half a neuron left and down for each column before. */
export function deckPosition(deck: ColumnGeometry, column: number, row: number): Point {
  return { x: deck.x - column * deck.r, y: deck.ys[row] + column * deck.r };
}
