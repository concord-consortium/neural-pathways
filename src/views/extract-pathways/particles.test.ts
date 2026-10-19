import { signColor } from "../../core/colors";
import { forward } from "../../core/network/forward";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import { toyNetwork } from "../../core/network/toy-network";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { centerShift, columnValues, deckMid, deckWidth, setOffset } from "./deck-layout";
import { extractGeometry } from "./extract-geometry";
import {
  faceSources, landedCounts, Particle, particleAt, particlePlan, PARTICLES_MS, particleTarget, seededRandom,
} from "./particles";
import { barLengths, pathwaysLayout } from "./pathways-layout";

const SIZES = [10, 8, 6, 2];

describe("seededRandom", () => {
  it("gives the same numbers from the same seed, each from 0 up to 1", () => {
    const a = seededRandom(48);
    const b = seededRandom(48);
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    first.forEach(n => {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    });
  });
});

describe("particlePlan", () => {
  const { particles, need } = particlePlan();

  it("shares about 1,500 particles among the bars by length, at least 4 each", () => {
    expect(need).toHaveLength(42);
    expect(Math.min(...need)).toBeGreaterThanOrEqual(4);
    expect(Math.abs(particles.length - 1500)).toBeLessThan(42);
    const lengths = barLengths();
    expect(need[lengths.indexOf(Math.max(...lengths))]).toBe(Math.max(...need));
  });

  it("lands every particle before the flight ends", () => {
    expect(Math.max(...particles.map(p => p.leave + p.fly))).toBeLessThanOrEqual(PARTICLES_MS);
  });
});

describe("landedCounts", () => {
  it("counts none at the start and every bar's share at the end", () => {
    expect(landedCounts(0).every(n => n === 0)).toBe(true);
    expect(landedCounts(PARTICLES_MS)).toEqual(particlePlan().need);
  });
});

describe("particleTarget", () => {
  it("lands each particle a little further out from zero than the one before, in the loading's direction", () => {
    const bar = { neuron: 0, pathway: 0, loading: -0.3, length: 20, zero: 100, y: 50 };
    const particle = { index: 1 } as Particle;
    expect(particleTarget(particle, bar, 4)).toEqual({ x: 90, y: 50 });
    expect(particleTarget(particle, { ...bar, loading: 0.3 }, 4)).toEqual({ x: 110, y: 50 });
  });
});

describe("particleAt", () => {
  const particle: Particle = { bar: 0, index: 0, order: 0, leave: 100, fly: 1000, rise: 50, pull: 40 };
  const from = { x: 0, y: 200 };
  const to = { x: 300, y: 100 };

  it("isn't drawn before it leaves or once it lands", () => {
    expect(particleAt(particle, 100, from, to)).toBeUndefined();
    expect(particleAt(particle, 1100, from, to)).toBeUndefined();
  });

  it("starts at its source and ends on its bar", () => {
    const start = particleAt(particle, 101, from, to)!;
    expect(start.x).toBeCloseTo(0, 0);
    expect(start.y).toBeCloseTo(200, 0);
    const end = particleAt(particle, 1099, from, to)!;
    expect(end.x).toBeCloseTo(300, 0);
    expect(end.y).toBeCloseTo(100, 0);
  });

  it("curves up and right of the straight line", () => {
    const middle = particleAt(particle, 600, from, to)!;
    expect(middle.y).toBeLessThan(150);
    expect(middle.x).toBeGreaterThan(150);
  });

  it("fades up as it leaves and out as it lands", () => {
    expect(particleAt(particle, 160, from, to)!.opacity).toBeCloseTo(0.5);
    expect(particleAt(particle, 600, from, to)!.opacity).toBe(1);
    expect(particleAt(particle, 1000, from, to)!.opacity).toBeCloseTo(0.5);
  });
});

describe("faceSources", () => {
  const base = fixture.conversations.map(c => forward(toyNetwork, c.text));
  const passes = Array.from({ length: 800 }, (_, i) => base[i % base.length]);
  const g = extractGeometry(SIZES, 0);

  it("takes the gauges of the deck's faces where the slide leaves them, half off the canvas", () => {
    const sources = faceSources(g, passes, 800);
    expect(sources.length).toBeGreaterThan(20 * 14);
    const right = (g.deck.r * deckWidth(800)) / 2;
    sources.forEach(source => expect(source.x).toBeLessThanOrEqual(right));
    expect(sources.some(source => source.x > 0)).toBe(true);
  });

  /** How many of a column's gauges are drawn: those tall enough to show. */
  const drawn = (set: number, column: number) =>
    columnValues(passes, set, column).filter(v => g.deck.r * Math.min(1, Math.abs(v)) >= MIN_GAUGE).length;
  /** Each column's top drawn gauge, if it has one. */
  const tops = (size: number) =>
    Array.from({ length: size }, (_, i) => i).filter(i => drawn(Math.floor(i / 20), i % 20) > 0).length;
  /** The right face: every drawn gauge of set 0's 20 columns. */
  const rightFace = Array.from({ length: 20 }, (_, column) => drawn(0, column)).reduce((sum, n) => sum + n, 0);

  it("takes every drawn gauge of set 0 and each column's top drawn gauge, each at its fill in its sign's color", () => {
    const sources = faceSources(g, passes, 20);
    expect(sources).toHaveLength(rightFace + tops(20));
    // A gauge's fill is centered half its height from the row's middle, toward its sign.
    const column = 3;
    const values = columnValues(passes, 0, column);
    const row = values.findIndex(v => v < 0 && g.deck.r * Math.min(1, -v) >= MIN_GAUGE);
    const height = g.deck.r * Math.min(1, -values[row]);
    expect(sources).toContainEqual({
      x: centerShift(g) - deckMid(g) + g.deck.r * setOffset(0, 20) + g.deck.x - column * g.deck.r,
      y: g.deck.ys[row] + column * g.deck.r + height / 2,
      color: signColor(values[row]),
    });
  });

  it("takes a column's top drawn gauge, past a top row too small to draw", () => {
    // Column 5's top row at 0: the right face loses that gauge, and the top takes the next one.
    const quiet = passes.map((pass, i) => (
      i === 5 ? { ...pass, layers: pass.layers.map((layer, k) => (k === 1 ? [0, ...layer.slice(1)] : layer)) } : pass
    ));
    expect(faceSources(g, quiet, 20)).toHaveLength(faceSources(g, passes, 20).length - 1);
  });

  it("takes the right face, then the front face, then the top, back set first", () => {
    const shows = (set: number, column: number) => columnValues(passes, set, column)
      .flatMap((v, row) => (g.deck.r * Math.min(1, Math.abs(v)) >= MIN_GAUGE ? [row] : []));
    /** Where the source for a gauge of a deck of 40 is: its fill's center, in its sign's color. */
    const source = (set: number, column: number, row: number) => {
      const v = columnValues(passes, set, column)[row];
      const half = (g.deck.r * Math.min(1, Math.abs(v))) / 2;
      const cy = g.deck.ys[row] + column * g.deck.r;
      return {
        x: centerShift(g) - deckMid(g) + g.deck.r * setOffset(set, 40) + g.deck.x - column * g.deck.r,
        y: v >= 0 ? cy - half : cy + half,
        color: signColor(v),
      };
    };
    const sources = faceSources(g, passes, 40);
    const front = shows(1, 19).length;
    expect([
      sources[0], sources[rightFace - 1], sources[rightFace], sources[rightFace + front], sources[sources.length - 1],
    ]).toEqual([
      source(0, 0, shows(0, 0)[0]),
      source(0, 19, shows(0, 19)[shows(0, 19).length - 1]),
      source(1, 19, shows(1, 19)[0]),
      source(1, 0, shows(1, 0)[0]),
      source(0, 19, shows(0, 19)[0]),
    ]);
  });

  it("takes a short last set's last column as the front face only where it shows", () => {
    // Set 2 of a deck of 59 holds 19 columns, and nothing in front covers its last; set 2 of a deck
    // of 50 holds 10, and set 1 covers its last.
    expect(faceSources(g, passes, 59)).toHaveLength(rightFace + drawn(1, 19) + drawn(2, 18) + tops(59));
    expect(faceSources(g, passes, 50)).toHaveLength(rightFace + drawn(1, 19) + tops(50));
  });

  it("lays out the bars at the lengths the plan shares particles by", () => {
    const layout = pathwaysLayout(g, 800);
    expect(layout.bars.map(bar => bar.length)).toEqual(barLengths());
  });
});
