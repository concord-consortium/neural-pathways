import { forward } from "../../core/network/forward";
import { toyNetwork } from "../../core/network/toy-network";
import fixture from "../../core/network/__fixtures__/toy-network-conversations.json";
import { centerShift, deckMid, deckWidth, setOffset } from "./deck-layout";
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

  it("takes every row of a short last set's last column when it shows, as the front face", () => {
    // Set 2 of a deck of 59 holds 19 columns, and nothing in front covers its last; the top alone
    // would give that column one source at most.
    const x = centerShift(g) - deckMid(g) + g.deck.r * setOffset(2, 59) + g.deck.x - 18 * g.deck.r;
    const fromLastColumn = faceSources(g, passes, 59).filter(source => Math.abs(source.x - x) < 1e-9);
    expect(fromLastColumn.length).toBeGreaterThan(1);
  });

  it("targets bars that are laid out for the same deck", () => {
    const layout = pathwaysLayout(g, 800);
    expect(layout.bars).toHaveLength(particlePlan().need.length);
  });
});
