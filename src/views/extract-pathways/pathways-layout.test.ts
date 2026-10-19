import { extractGeometry } from "./extract-geometry";
import { barLength, barLengths, BOX_SIDE, LABEL_GAP, LOADINGS, pathwaysLayout } from "./pathways-layout";

const SIZES = [10, 8, 6, 2];
// The narrowest canvas.
const g = extractGeometry(SIZES, 0);
const layout = pathwaysLayout(g, 800);

describe("barLength", () => {
  it("draws the largest loading 44 px long, and none shorter than 1.5", () => {
    expect(barLength(-0.585)).toBe(44);
    expect(barLength(0.2925)).toBeCloseTo(22);
    expect(barLength(0.008)).toBe(1.5);
  });

  it("gives every bar a length, neuron by neuron", () => {
    expect(LOADINGS).toHaveLength(14);
    expect(barLengths()).toHaveLength(42);
    expect(barLengths()[3]).toBe(barLength(LOADINGS[1][0]));
  });
});

describe("pathwaysLayout", () => {
  it("slides the lifted column to 100 px clear of the half of the deck still showing, whatever its size", () => {
    expect(g.lifted.x + layout.liftedDx - g.lifted.r).toBeCloseTo((g.deck.r * 99) / 2 + 100);
    // A deck of 20 is one set, 21 radii wide.
    expect(g.lifted.x + pathwaysLayout(g, 20).liftedDx - g.lifted.r).toBeCloseTo((g.deck.r * 21) / 2 + 100);
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
