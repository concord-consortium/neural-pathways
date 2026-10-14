import type { ForwardPass } from "../../core/network/forward";
import type { ExtractGeometry } from "./extract-geometry";

// The deck that Collect All Conversations builds, after the prototype's runExtract: CUBE_TOTAL,
// CB_NSETS, centreCube, colGap, cbSetLeft, cbSetX, cbSetEnter, cbSetGap, cbSetMove and cbSetHold.
// Sets are numbered from 0, so set 0 is the one in front. Offsets and widths are in deck radii
// (the deck's `r`), so they hold at any canvas width. src/views/README.md says where the
// prototype is.

/** Columns in a set: the columns that move together as one slab of the deck. */
export const SET_SIZE = 20;
/** The most sets a deck has. */
export const MAX_SETS = 40;
/** The most conversations the deck holds. */
export const MAX_DECK = SET_SIZE * MAX_SETS;

const COLUMN_SLOW = 900;
const COLUMN_FAST = 240;
const ENTER_FIRST = 50;
const ENTER_MIN = 8;
/** The sets over which the entry distance falls from ENTER_FIRST to ENTER_MIN. */
const ENTER_STEPS = 7;

/** How many conversations the deck holds when `conversations` are loaded: all of them, up to 800. */
export function deckSize(conversations: number): number {
  return Math.min(conversations, MAX_DECK);
}

/** How many sets a deck of `size` columns has. The last may be partial. */
export function setCount(size: number): number {
  return Math.ceil(size / SET_SIZE);
}

/** How many columns set `set` of a deck of `size` holds: 20, but the last set may hold fewer. */
export function columnsInSet(set: number, size: number): number {
  return Math.min(SET_SIZE, size - set * SET_SIZE);
}

/** A conversation's hidden activations: Hidden Layer 1's, then Hidden Layer 2's. */
export function hiddenValues(pass: ForwardPass): number[] {
  return pass.layers.slice(1, -1).flat();
}

/** The hidden activations column `column` of set `set` shows: those of conversation `set * SET_SIZE + column`. */
export function columnValues(passes: readonly ForwardPass[], set: number, column: number): number[] {
  return hiddenValues(passes[set * SET_SIZE + column]);
}

/**
 * How wide a deck of `size` columns is, in deck radii. Each column is a radius left of the one
 * before, so a full set is 21 wide, and each set behind it adds a neuron's width, 2. A lone partial
 * set is as wide as its columns.
 */
export function deckWidth(size: number): number {
  const sets = setCount(size);
  return sets === 1 ? size + 1 : SET_SIZE + 1 + 2 * (sets - 1);
}

/** How far right of where its columns are drawn set 0 sits once its first `columns` are centered. */
export function firstSetOffset(columns: number): number {
  return (columns - 1) / 2;
}

/**
 * How far right of where its columns are drawn set `set` sits in a centered deck of `sets` sets.
 * Each set is a neuron's width left of the one in front of it.
 */
export function setOffset(set: number, sets: number): number {
  return (SET_SIZE - 1) / 2 + (sets - 1) - 2 * set;
}

/** Where set `set` sits once a deck of `size` columns is done. */
export function restOffset(set: number, size: number): number {
  const sets = setCount(size);
  return sets === 1 ? firstSetOffset(size) : setOffset(set, sets);
}

/** The middle of the deck's room: halfway between the canvas's left edge and the lifted column's. */
export function deckMid(geometry: Pick<ExtractGeometry, "lifted">): number {
  return (geometry.lifted.x - geometry.lifted.r) / 2;
}

/**
 * How far centering moves the deck, in px: from where its columns are drawn, in the left strip, to
 * where the offsets above center it in its room.
 */
export function centerShift(geometry: Pick<ExtractGeometry, "lifted" | "deck">): number {
  return deckMid(geometry) - geometry.deck.x;
}

/**
 * The beat before column `column` of set 0 lands, in a run that started with `from` columns in:
 * 900 ms for the run's first column down to 240 for the set's last, on a smoothstep across the
 * columns the run adds, so the run has the same shape wherever it starts.
 */
export function columnGap(column: number, from: number): number {
  const first = Math.min(from, SET_SIZE - 2);
  const t = Math.min(1, Math.max(0, (column - first) / (SET_SIZE - 1 - first)));
  const eased = t * t * (3 - 2 * t);
  return Math.round(COLUMN_FAST + (COLUMN_SLOW - COLUMN_FAST) * (1 - eased));
}

/** How far short of its place set `set`, from set 2 on, arrives, in px: 50, down to 8 by set 9. */
export function setEnter(set: number): number {
  const step = set - 2;
  if (step >= ENTER_STEPS) {
    return ENTER_MIN;
  }
  return ENTER_MIN + (ENTER_FIRST - ENTER_MIN) * (1 - step / ENTER_STEPS);
}

/** The beat after set `set` arrives, in a deck of `sets` sets: 440 ms for set 2, down to 80. */
export function setGap(set: number, sets: number): number {
  const t = (set - 2) / Math.max(1, sets - 3);
  return Math.round(80 + 360 * Math.pow(1 - t, 1.9));
}

/** How long a set takes to close up after a beat of `gap`: a little longer, between 90 and 300 ms. */
export function setMove(gap: number): number {
  return Math.max(90, Math.min(300, Math.round(gap * 1.15)));
}

/** How long sets 2 and 3 stand before closing up, so the closing is seen before it speeds up. */
export function setHold(set: number): number {
  if (set === 2) {
    return 340;
  }
  return set === 3 ? 170 : 0;
}
