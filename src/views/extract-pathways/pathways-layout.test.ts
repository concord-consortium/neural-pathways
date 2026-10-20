import { fixtureLoadings } from "../../core/network/__fixtures__/alien3-network";
import { extractGeometry } from "./extract-geometry";
import { barLength, barLengths, BOX_SIDE, LABEL_GAP, loadingMax, pathwaysLayout } from "./pathways-layout";

const SIZES = [10, 8, 6, 2];
// The narrowest canvas.
const g = extractGeometry(SIZES, 0);
const layout = pathwaysLayout(g, 800, fixtureLoadings);

describe("barLength", () => {
  it("draws the largest loading 44 px long, and none shorter than 1.5", () => {
    expect(barLength(-0.585, 0.585)).toBe(44);
    expect(barLength(0.2925, 0.585)).toBeCloseTo(22);
    expect(barLength(0.008, 0.585)).toBe(1.5);
  });

  it("gives every bar a length, neuron by neuron, on the largest loading's scale", () => {
    const max = loadingMax(fixtureLoadings);
    expect(max).toBe(Math.max(...fixtureLoadings.flat().map(Math.abs)));
    expect(barLengths(fixtureLoadings)).toHaveLength(42);
    expect(barLengths(fixtureLoadings)[3]).toBe(barLength(fixtureLoadings[1][0], max));
    expect(Math.max(...barLengths(fixtureLoadings))).toBe(44);
  });
});

describe("pathwaysLayout", () => {
  it("refuses loadings without a row for each lifted neuron", () => {
    expect(() => pathwaysLayout(g, 800, fixtureLoadings.slice(1)))
      .toThrow("Expected loadings for 14 neurons on 3 pathways, got 13 rows of 3");
  });

  it("refuses loadings on another number of pathways", () => {
    expect(() => pathwaysLayout(g, 800, fixtureLoadings.map(row => row.slice(0, 2))))
      .toThrow("Expected loadings for 14 neurons on 3 pathways, got 14 rows of 2");
  });

  it("slides the lifted column to 100 px clear of the half of the deck still showing, whatever its size", () => {
    expect(g.lifted.x + layout.liftedDx - g.lifted.r).toBeCloseTo((g.deck.r * 99) / 2 + 100);
    // A deck of 20 is one set, 21 radii wide.
    const oneSet = pathwaysLayout(g, 20, fixtureLoadings);
    expect(g.lifted.x + oneSet.liftedDx - g.lifted.r).toBeCloseTo((g.deck.r * 21) / 2 + 100);
  });

  it("puts three bars beside each neuron, one per pathway, 7 apart, on a zero 52 px right of the column's edge", () => {
    expect(layout.bars).toHaveLength(42);
    expect(layout.bars[3]).toMatchObject({ neuron: 1, pathway: 0, y: g.lifted.ys[1] - 7 });
    expect(layout.bars[5].y).toBe(g.lifted.ys[1] + 7);
    expect(layout.bars[0].zero).toBeCloseTo(g.lifted.x + layout.liftedDx + g.lifted.r + 8 + 44);
  });

  it("rules each neuron's zero from its top bar's upper edge to its bottom bar's lower edge", () => {
    expect(layout.rules[0]).toEqual({ x: layout.bars[0].zero, y1: g.lifted.ys[0] - 10, y2: g.lifted.ys[0] + 10 });
  });

  it("stands the boxes a quarter, a half and three quarters down the column, 186 px right of its center", () => {
    const top = g.lifted.ys[0];
    const span = g.lifted.ys[13] - top;
    expect(layout.boxes.map(box => box.cy)).toEqual([1, 2, 3].map(q => Math.round(top + (q * span) / 4)));
    expect(layout.boxes[0].x).toBeCloseTo(g.lifted.x + layout.liftedDx + 186);
  });

  it("fits the box labels inside the narrowest canvas", () => {
    // "Pathway 3" at 13 px is under 70 px wide.
    expect(layout.boxes[2].x + BOX_SIDE + LABEL_GAP + 70).toBeLessThan(g.width);
  });
});
