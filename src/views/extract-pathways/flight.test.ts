import { Flight, flightDuration, placeCopy } from "./flight";

// Three copies flying right into a column, the first from farthest away.
const flights: Flight[] = [
  { from: { x: 0, y: 0 }, to: { x: 400, y: 0 }, fromR: 12, toR: 8 },
  { from: { x: 100, y: 0 }, to: { x: 400, y: 20 }, fromR: 12, toR: 8 },
  { from: { x: 200, y: 0 }, to: { x: 400, y: 40 }, fromR: 12, toR: 8 },
];
const LAND = [936, 1016, 1096];

const distanceToMark = (k: number, t: number) => {
  const placed = placeCopy(flights, k, t);
  return Math.hypot(placed.x - flights[k].to.x, placed.y - flights[k].to.y);
};

describe("flightDuration", () => {
  it("lasts until the last copy settles", () => {
    expect(flightDuration(14)).toBe(936 + 13 * 80 + 190);
    expect(flightDuration(3)).toBe(1096 + 190);
  });
});

describe("placeCopy", () => {
  it("starts each copy on its source, at the source's size", () => {
    expect(placeCopy(flights, 0, 0)).toEqual({ x: 0, y: 0, r: 12 });
    expect(placeCopy(flights, 2, 0)).toEqual({ x: 200, y: 0, r: 12 });
  });

  it("ends each copy on its mark, at the column's size", () => {
    for (let k = 0; k < 3; k++) {
      const placed = placeCopy(flights, k, flightDuration(3));
      expect(placed.x).toBeCloseTo(flights[k].to.x);
      expect(placed.y).toBeCloseTo(flights[k].to.y);
      expect(placed.r).toBe(8);
    }
  });

  it("lands the copies in order, 80 ms apart, 7 px past the mark", () => {
    LAND.forEach((land, k) => {
      expect(distanceToMark(k, land)).toBeCloseTo(7);
      const placed = placeCopy(flights, k, land);
      const travel = { x: flights[k].to.x - flights[k].from.x, y: flights[k].to.y - flights[k].from.y };
      const past = (placed.x - flights[k].to.x) * travel.x + (placed.y - flights[k].to.y) * travel.y;
      expect(past).toBeGreaterThan(0);
    });
    expect(distanceToMark(0, LAND[0] + 10)).toBeLessThan(7);
    expect(distanceToMark(1, LAND[0] + 10)).toBeGreaterThan(7);
  });

  it("is still on its way before it lands, and shrinks on the way", () => {
    const placed = placeCopy(flights, 0, 600);
    expect(placed.x).toBeGreaterThan(0);
    expect(placed.x).toBeLessThan(400);
    expect(placed.r).toBeLessThan(12);
    expect(placed.r).toBeGreaterThan(8);
  });

  it("settles back onto the mark over 190 ms", () => {
    expect(distanceToMark(0, LAND[0] + 95)).toBeGreaterThan(0);
    expect(distanceToMark(0, LAND[0] + 190)).toBeCloseTo(0);
  });
});
