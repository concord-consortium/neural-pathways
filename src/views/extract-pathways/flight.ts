import { cubicBezier } from "../../core/network-diagram/easing";
import { Point } from "../../core/network-diagram/layout";

// The prototype's flyInto (neural-net-maker index.html), at Med.
export const LIFT_MS = 800;
/** When the first copy lands, in ms after the flight starts. */
const FIRST_LANDING = Math.round(LIFT_MS * 1.17);
/** Between one copy landing and the next. */
export const LAND_GAP = 80;
/** How far a copy passes its mark before settling back. */
const SETTLE_PX = 7;
export const SETTLE_MS = 190;
// x and y ease differently, so the path curves.
const easeX = cubicBezier(0.7, 0, 0.75, 0.75);
const easeY = cubicBezier(0.45, 0.05, 0.3, 1);
const settleEase = cubicBezier(0.25, 0.9, 0.35, 1);

/** How long a flight of `count` copies takes, until the last has settled. */
export function flightDuration(count: number): number {
  return FIRST_LANDING + (count - 1) * LAND_GAP + SETTLE_MS;
}

/** One copy's journey: from a neuron to its place in a column, shrinking or growing on the way. */
export interface Flight {
  from: Point;
  to: Point;
  fromR: number;
  toR: number;
}

export interface Placed {
  x: number;
  y: number;
  r: number;
}

/**
 * Where copy `k` of `flights` is, `t` ms after the flight began. Copies land in order, LAND_GAP
 * apart, so a column fills top to bottom. Each flies for longer the farther it goes, passes its
 * mark by SETTLE_PX along its line of travel, and settles back.
 */
export function placeCopy(flights: readonly Flight[], k: number, t: number): Placed {
  const longest = Math.max(1, ...flights.map(f => Math.hypot(f.from.x - f.to.x, f.from.y - f.to.y)));
  const { from, to, fromR, toR } = flights[k];
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const length = Math.hypot(dx, dy);
  const duration = Math.round(LIFT_MS * (0.72 + 0.45 * (length / longest)));
  const land = FIRST_LANDING + k * LAND_GAP;
  const start = Math.max(0, land - duration);
  const end = start + duration;
  // The overshoot: past the mark, in the direction of travel.
  const overX = (-dx / (length || 1)) * SETTLE_PX;
  const overY = (-dy / (length || 1)) * SETTLE_PX;
  const grow = fromR / toR;

  let offsetX: number;
  let offsetY: number;
  let scale: number;
  if (t <= start) {
    offsetX = dx;
    offsetY = dy;
    scale = grow;
  } else if (t < end) {
    const p = (t - start) / duration;
    offsetX = dx + (overX - dx) * easeX(p);
    offsetY = dy + (overY - dy) * easeY(p);
    scale = grow + (1 - grow) * easeY(p);
  } else {
    const settled = settleEase(Math.min(1, (t - end) / SETTLE_MS));
    offsetX = overX * (1 - settled);
    offsetY = overY * (1 - settled);
    scale = 1;
  }
  return { x: to.x + offsetX, y: to.y + offsetY, r: toR * scale };
}
