import { signColor } from "../../core/colors";
import { ForwardPass } from "../../core/network/forward";
import { Point } from "../../core/network-diagram/layout";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import { centerShift, columnValues, deckMid, SET_SIZE, setCount, setOffset } from "./deck-layout";
import type { ExtractGeometry } from "./extract-geometry";
import { Bar, barLengths } from "./pathways-layout";

// The particles that carry the deck's readings to the loading bars, after the prototype's
// faceGauges, flyParticles and ptFrame. Its Math.random is a seeded generator here, so a moment
// always draws the same picture. src/views/README.md says where the prototype is.

export const PARTICLE_COUNT = 1500;
export const PARTICLE_R = 1.7;
/** Each bar's particles leave over this long, a little further along the bar each time. */
const STAGGER = 2600;
const JITTER = 160;
const FLY_MS = 1500;
const TAIL = 400;
/** How long the particles' flight takes, until the bars are finished. */
export const PARTICLES_MS = STAGGER + FLY_MS * 1.25 + TAIL;
/** Steps through the sources, so consecutive particles come from different parts of the deck. */
export const SOURCE_STEP = 7919;
const SEED = 48;

const MODULUS = 4294967296;

/**
 * A small seeded generator (a linear congruential generator, kept in plain arithmetic so every
 * product stays exact): numbers from 0 up to 1.
 */
export function seededRandom(seed: number): () => number {
  let state = seed % MODULUS;
  return () => {
    state = (state * 1664525 + 1013904223) % MODULUS;
    return state / MODULUS;
  };
}

/** One particle: its bar, its place in that bar's share, and its timing and curve. */
export interface Particle {
  bar: number;
  /** Its place among its bar's particles, which sets where on the bar it lands. */
  index: number;
  /** Its place among all of them, which picks its source. */
  order: number;
  leave: number;
  fly: number;
  /** How far its curve rises above, and is pulled right of, the straight line. */
  rise: number;
  pull: number;
}

let plan: { particles: Particle[]; need: number[] } | undefined;

/**
 * Every particle's bar and timing. Each bar gets particles in proportion to its length, at least 4,
 * so every bar is built at the same rate. It depends on nothing but the loadings, so it is worked
 * out once.
 */
export function particlePlan(): { particles: Particle[]; need: number[] } {
  if (plan) {
    return plan;
  }
  const lengths = barLengths();
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const need = lengths.map(length => Math.max(4, Math.round((PARTICLE_COUNT * length) / total)));
  const random = seededRandom(SEED);
  const particles: Particle[] = [];
  need.forEach((count, bar) => {
    for (let index = 0; index < count; index++) {
      // In the prototype's order of Math.random calls: the rise, the pull, the jitter, the flight.
      const rise = 40 + random() * 90;
      const pull = 30 + random() * 70;
      const leave = (index / count) * STAGGER + random() * JITTER;
      const fly = FLY_MS * (0.8 + random() * 0.45);
      particles.push({ bar, index, order: particles.length, leave, fly, rise, pull });
    }
  });
  plan = { particles, need };
  return plan;
}

/** How many of each bar's particles have landed `t` ms into the flight. */
export function landedCounts(t: number): number[] {
  const { particles, need } = particlePlan();
  const landed = need.map(() => 0);
  for (const particle of particles) {
    if (t >= particle.leave + particle.fly) {
      landed[particle.bar]++;
    }
  }
  return landed;
}

/** Where a particle lands: on its bar, a little further out from zero than the one before it. */
export function particleTarget(particle: Particle, bar: Bar, need: number): Point {
  const direction = bar.loading >= 0 ? 1 : -1;
  return { x: bar.zero + (direction * bar.length * (particle.index + 1)) / need, y: bar.y };
}

/**
 * Where a particle is `t` ms into the flight, on a curve from `from` to `to`, and how visible: it
 * fades up over the first 12% of its flight and out over the last 20%. Undefined before it leaves
 * and once it lands.
 */
export function particleAt(particle: Particle, t: number, from: Point, to: Point):
  { x: number; y: number; opacity: number } | undefined {
  const u = (t - particle.leave) / particle.fly;
  if (u <= 0 || u >= 1) {
    return undefined;
  }
  const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const k = 1 - e;
  const cx = (from.x + to.x) / 2 + particle.pull;
  const cy = (from.y + to.y) / 2 - particle.rise;
  let opacity = u < 0.12 ? u / 0.12 : 1;
  if (u > 0.8) {
    opacity = (1 - u) / 0.2;
  }
  return {
    x: k * k * from.x + 2 * k * e * cx + e * e * to.x,
    y: k * k * from.y + 2 * k * e * cy + e * e * to.y,
    opacity,
  };
}

/** A gauge a particle can leave from: its fill's center, where the slide leaves it, and its color. */
export interface Source {
  x: number;
  y: number;
  color: string;
}

/**
 * Every drawn gauge on the deck's visible faces, once the deck has slid half off the canvas: every
 * row of set 0, the right face; every row of each later set's last column, the front face; and
 * each column's top drawn gauge, the top, in the prototype's order (back set first, set 0 last).
 */
export function faceSources(geometry: ExtractGeometry, passes: readonly ForwardPass[], size: number): Source[] {
  const { deck } = geometry;
  const sets = setCount(size);
  const slid = centerShift(geometry) - deckMid(geometry);
  const columnsIn = (set: number) => Math.min(SET_SIZE, size - set * SET_SIZE);
  const gauge = (set: number, column: number, row: number): Source | undefined => {
    const v = columnValues(passes, set, column)[row];
    const height = deck.r * Math.min(1, Math.abs(v));
    if (height < MIN_GAUGE) {
      return undefined;
    }
    const cy = deck.ys[row] + column * deck.r;
    return {
      x: slid + deck.r * setOffset(set, size) + deck.x - column * deck.r,
      y: v >= 0 ? cy - height / 2 : cy + height / 2,
      color: signColor(v),
    };
  };
  const sources: Source[] = [];
  const push = (source: Source | undefined) => {
    if (source) {
      sources.push(source);
    }
  };
  for (let column = 0; column < columnsIn(0); column++) {
    deck.ys.forEach((_, row) => push(gauge(0, column, row)));
  }
  // A partial last set has no full last column, so, like faceOf's shading, it adds no front-face sources.
  for (let set = 1; set < sets; set++) {
    if (columnsIn(set) === SET_SIZE) {
      deck.ys.forEach((_, row) => push(gauge(set, SET_SIZE - 1, row)));
    }
  }
  const backToFront = Array.from({ length: sets }, (_, i) => sets - 1 - i);
  for (const set of backToFront) {
    for (let column = 0; column < columnsIn(set); column++) {
      const top = deck.ys.map((_, row) => gauge(set, column, row)).find(Boolean);
      push(top);
    }
  }
  return sources;
}
