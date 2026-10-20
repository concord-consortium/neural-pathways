import { clamp01, cubicBezier, ease } from "../../core/network-diagram/easing";
import { collectDuration, collectSceneAt } from "./collect-timeline";
import {
  columnGap, columnsInSet, columnsWithSets, setCount, setEnter, setGap, setHold, setMove, setOffset,
} from "./deck-layout";
import { DeckScene, DeckSetScene, ExtractScene, restScene, SPOTLIGHT } from "./extract-scene";
import { easeX, SETTLE_MS, SETTLE_PX, settleEase } from "./flight";
import { easeBetween } from "./setup-timeline";
import { lerp, Transition, transitionAt } from "./transitions";

// The timings, distances and curves below are the prototype's, in ms at its "Med" speed, so each
// can be checked against its source: collectAll, handOver, hideDiagram, centreCube, buildRest,
// addColumn, settleXY, nameColumn, showCount, dropName, cbSetTwo, cbHeadPair, cbLayout and
// cbAddSet. src/views/README.md says where the prototype is.

/** Collect All collects by hand, as Collect a Conversation does, until this many are in. */
export const BY_HAND = 3;
const HANDOVER_REST = 450;
const HIDE_MS = 420;
/** After the network starts to fade, before the deck starts to move to the middle of its room. */
const CENTER_DELAY = 200;
const CENTER_MS = 700;
export const HANDOVER_MS = HANDOVER_REST + CENTER_DELAY + CENTER_MS;
/** A column of set 0 starts this far left of its place, passes it, and settles back. */
const COLUMN_SLIDE = 16;
const COLUMN_OVERSHOOT = Math.min(SETTLE_PX, COLUMN_SLIDE / 4);
const COLUMN_IN_MS = 420;
const COLUMN_SETTLE_MS = Math.max(70, Math.min(SETTLE_MS, Math.round(COLUMN_IN_MS * 0.55)));
const COLUMN_FADE_MS = Math.round(COLUMN_IN_MS * 0.6);
const LABEL_FADE_MS = 150;
const COUNT_REST = 520;
const COUNT_FADE_MS = 320;
const COUNT_HOLD = 340;
/** Set 1 comes in a column at a time, then closes up with set 0. */
const SET1_STEP = 120;
const SET1_COLUMN_FADE_MS = 140;
const SET1_CLOSE_DELAY = 280;
const SET1_CLOSE_MS = 620;
const SET1_NEXT = 900;
const SET1_ENTER = 50;
/** The count changes behind a fade as set 1 closes. */
const COUNT_OUT_MS = 300;
const COUNT_SWAP = 320;
const SET_FADE_MS = 160;
const HELD_SET_FADE_MS = 220;

/** The prototype's MOVE_EASE, for long moves that slow into place. */
export const moveEase = cubicBezier(0.35, 0.75, 0.3, 1);

/** One beat of set 0: the column that arrives, when, and how long until the next. */
interface Beat {
  column: number;
  start: number;
  gap: number;
}

/** A set from 2 on: when it arrives, how long it fades in, and how far short of its place. */
interface SetEntry {
  set: number;
  at: number;
  fade: number;
  enter: number;
}

/** Every set closing up to its place in a deck of `sets` sets. */
interface Close {
  start: number;
  duration: number;
  sets: number;
}

/** When each part of a Collect All run happens, in ms from the run's start. */
export interface CollectAllPlan {
  /** The conversations collected by hand first, in order. */
  byHand: number[];
  /** When the hand-over starts. */
  handOver: number;
  /** How many columns the deck has when the hand-over starts. */
  from: number;
  size: number;
  beats: Beat[];
  /** When the count starts to fade in. */
  countAt: number;
  /** When each of set 1's columns appears. */
  set1: number[];
  entries: SetEntry[];
  closes: Close[];
  end: number;
}

/** The plan of a run that starts with `collected` in, for a deck of `size`. */
export function collectAllPlan(columnSizes: readonly number[], collected: number, size: number): CollectAllPlan {
  const target = Math.min(BY_HAND, size);
  const byHand: number[] = [];
  let at = 0;
  for (let n = collected + 1; n <= target; n++) {
    byHand.push(n);
    at += collectDuration(columnSizes, n);
  }
  const handOver = at;
  const from = Math.max(collected, target);
  at += HANDOVER_MS;
  const beats: Beat[] = [];
  for (let column = from; column < columnsInSet(0, size); column++) {
    const gap = columnGap(column, from);
    beats.push({ column, start: at, gap });
    at += gap;
  }
  const countAt = at + COUNT_REST;
  at = countAt + COUNT_FADE_MS + COUNT_HOLD;
  let end = at;
  const sets = setCount(size);
  const set1: number[] = [];
  const entries: SetEntry[] = [];
  const closes: Close[] = [];
  if (sets >= 2) {
    for (let column = 0; column < columnsInSet(1, size); column++) {
      set1.push(at + column * SET1_STEP);
    }
    const close = set1[set1.length - 1] + SET1_CLOSE_DELAY;
    closes.push({ start: close, duration: SET1_CLOSE_MS, sets: 2 });
    end = close + SET1_CLOSE_MS;
    at = close + SET1_NEXT;
    for (let set = 2; set < sets; set++) {
      const gap = setGap(set, sets);
      const hold = setHold(set);
      const move = setMove(gap);
      const fade = hold ? HELD_SET_FADE_MS : SET_FADE_MS;
      entries.push({ set, at, fade, enter: setEnter(set) });
      closes.push({ start: at + hold, duration: move, sets: set + 1 });
      end = Math.max(at + hold + move, at + fade);
      at += gap + hold;
    }
  }
  return { byHand, handOver, from, size, beats, countAt, set1, entries, closes, end };
}

export function collectAllDuration(columnSizes: readonly number[], collected: number, size: number): number {
  return collectAllPlan(columnSizes, collected, size).end;
}

/** A column of set 0 `since` ms after its beat started: how far from its place, in px, and its opacity. */
function arrival(since: number): { dx: number; opacity: number } {
  const dx = since < COLUMN_IN_MS
    ? -COLUMN_SLIDE + (COLUMN_OVERSHOOT + COLUMN_SLIDE) * easeX(since / COLUMN_IN_MS)
    : COLUMN_OVERSHOOT * (1 - settleEase((since - COLUMN_IN_MS) / COLUMN_SETTLE_MS));
  return { dx, opacity: ease(clamp01(since / COLUMN_FADE_MS)) };
}

/** Set `set`'s place at `t`, from `offset` and `shift`, carried by every close it is part of. */
function setPlace(plan: CollectAllPlan, set: number, offset: number, shift: number, t: number) {
  const closes = plan.closes.filter(close => close.sets > set);
  const to = (value: (close: Close) => number): Transition[] =>
    closes.map(close => ({ start: close.start, duration: close.duration, to: value(close) }));
  return {
    offset: transitionAt(offset, to(close => setOffset(set, columnsWithSets(close.sets, plan.size))), t),
    shift: transitionAt(shift, to(() => 0), t),
  };
}

/** Set 0 at `t`: where it sits, its settled columns, the ones still arriving, and the labels. */
function frontSet(plan: CollectAllPlan, t: number) {
  const { from, size, beats } = plan;
  const local = t - plan.handOver;
  const centered = moveEase(clamp01((local - HANDOVER_REST - CENTER_DELAY) / CENTER_MS));
  let offset = lerp(0, setOffset(0, Math.min(from + 1, size)), centered);
  let columns = from;
  const arriving: DeckScene["arriving"] = [];
  const labels: DeckScene["labels"] = [];
  beats.forEach((beat, i) => {
    if (t < beat.start) {
      return;
    }
    const since = t - beat.start;
    // Where the last beat, or the hand-over for the first, centered it.
    const was = setOffset(0, Math.max(beat.column, from + 1));
    offset = lerp(was, setOffset(0, beat.column + 1), moveEase(clamp01(since / beat.gap)));
    if (since >= COLUMN_IN_MS + COLUMN_SETTLE_MS) {
      columns = beat.column + 1;
    } else {
      arriving.push({ column: beat.column, ...arrival(since) });
    }
    const next = beats[i + 1];
    const fadeIn = easeBetween(0, 1, t, beat.start, LABEL_FADE_MS);
    const fadeOut = next
      ? easeBetween(0, 1, t, next.start, LABEL_FADE_MS)
      : easeBetween(0, 1, t, plan.countAt, COUNT_FADE_MS);
    const opacity = fadeIn * (1 - fadeOut);
    if (opacity > 0) {
      labels.push({ column: beat.column, opacity });
    }
  });
  return { centered, offset, columns, arriving, labels };
}

/** The count over the deck at `t`: set 0's, then changing as sets close. */
function countFor(plan: CollectAllPlan, t: number): DeckScene["count"] {
  if (t < plan.countAt) {
    return undefined;
  }
  let n = columnsWithSets(1, plan.size);
  let opacity = easeBetween(0, 1, t, plan.countAt, COUNT_FADE_MS);
  plan.closes.forEach((close, i) => {
    if (i === 0) {
      if (t >= close.start + COUNT_SWAP) {
        n = columnsWithSets(2, plan.size);
        opacity = easeBetween(0, 1, t, close.start + COUNT_SWAP, COUNT_OUT_MS);
      } else if (t >= close.start) {
        opacity = 1 - easeBetween(0, 1, t, close.start, COUNT_OUT_MS);
      }
    } else if (t >= close.start + close.duration) {
      n = columnsWithSets(close.sets, plan.size);
    }
  });
  return { n, opacity };
}

function deckAt(plan: CollectAllPlan, t: number): DeckScene {
  const front = frontSet(plan, t);
  const sets: DeckSetScene[] = [{
    ...setPlace(plan, 0, front.offset, 0, t), opacity: 1, columns: front.columns, lastOpacity: 1,
  }];
  const appeared = plan.set1.filter(at => t >= at).length;
  if (appeared > 0) {
    sets.push({
      ...setPlace(plan, 1, setOffset(1, columnsWithSets(2, plan.size)), -SET1_ENTER, t),
      opacity: 1,
      columns: appeared,
      lastOpacity: ease(clamp01((t - plan.set1[appeared - 1]) / SET1_COLUMN_FADE_MS)),
    });
  }
  let shade = plan.closes.length > 0 && t >= plan.closes[0].start ? 1 : 0;
  for (const entry of plan.entries) {
    if (t < entry.at) {
      break;
    }
    sets.push({
      ...setPlace(plan, entry.set, setOffset(entry.set, columnsWithSets(entry.set + 1, plan.size)), -entry.enter, t),
      opacity: easeBetween(0, 1, t, entry.at, entry.fade),
      columns: columnsInSet(entry.set, plan.size),
      lastOpacity: 1,
    });
    shade = entry.set;
  }
  const done = t >= plan.end;
  return {
    centered: front.centered,
    slide: 0,
    sets,
    arriving: front.arriving,
    shade,
    labels: front.labels,
    count: countFor(plan, t),
    collected: done ? plan.size : plan.from,
    done,
  };
}

/**
 * Collect All, `t` ms into a run that started with `collected` in, for a deck of `size`. It
 * collects by hand up to BY_HAND first. Then the network fades and the lifted column comes back to
 * full strength while the deck moves to the middle of its room; set 0 fills one labeled column at a
 * time; the count appears; set 1 comes in a column at a time and closes up; and every later set
 * arrives whole and closes up, faster and faster.
 */
export function collectAllSceneAt(columnSizes: readonly number[], collected: number, size: number,
  t: number): ExtractScene {
  const plan = collectAllPlan(columnSizes, collected, size);
  let start = 0;
  for (const n of plan.byHand) {
    const duration = collectDuration(columnSizes, n);
    if (t < start + duration) {
      return collectSceneAt(columnSizes, n, t - start);
    }
    start += duration;
  }
  const hidden = easeBetween(0, 1, t - plan.handOver, HANDOVER_REST, HIDE_MS);
  // Once the network is gone, the scene under the deck is the one resting at Setup's end.
  const scene = restScene(columnSizes, hidden < 1 ? plan.from + 1 : 1);
  scene.networkOpacity = 1 - hidden;
  scene.lifted = { ...scene.lifted!, opacity: 1 - SPOTLIGHT * (1 - hidden) };
  scene.collections = [];
  scene.deck = deckAt(plan, t);
  return scene;
}
