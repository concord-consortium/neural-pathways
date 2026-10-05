import { deckPosition, extractGeometry, MIN_CANVAS_WIDTH } from "./extract-geometry";

const SIZES = [10, 8, 6, 2];

describe("extractGeometry", () => {
  const g = extractGeometry(SIZES, MIN_CANVAS_WIDTH);

  it("centers the 537-wide network with a strip each side", () => {
    expect(g.width).toBe(995);
    expect(g.height).toBe(440);
    expect(g.networkX).toBe(229);
    expect(g.network.width).toBe(537);
    expect(g.network.radius).toBe(12);
  });

  it("keeps its minimum layout on a narrow host, to be scaled down, and widens on a wide one", () => {
    expect(extractGeometry(SIZES, 600).width).toBe(995);
    expect(extractGeometry(SIZES, 600).networkX).toBe(229);
    const wide = extractGeometry(SIZES, 1300);
    expect(wide.width).toBe(1300);
    expect(wide.networkX).toBe(382);
  });

  it("lists the 14 hidden nodes in canvas coordinates, Hidden Layer 1's first", () => {
    expect(g.hidden).toHaveLength(14);
    expect(g.hidden[0]).toEqual({ x: g.network.nodes[1][0].x + 229, y: g.network.nodes[1][0].y });
    expect(g.hidden[8]).toEqual({ x: g.network.nodes[2][0].x + 229, y: g.network.nodes[2][0].y });
  });

  it("stands the lifted column in the middle of the right strip, 28 apart, under its label", () => {
    expect(g.lifted.x).toBe(881);
    expect(g.lifted.r).toBe(12);
    expect(g.lifted.ys[0]).toBe(53);
    expect(g.lifted.ys[13]).toBeCloseTo(53 + 13 * 28);
    expect(g.lifted.ys[13] + g.lifted.r).toBeLessThanOrEqual(440 - 10);
  });

  it("sizes the deck for 20 columns and starts it in the middle of the left strip", () => {
    expect(g.deck.r).toBe(8.3);
    expect(g.deck.ys[0]).toBeCloseTo(44.3);
    expect(g.deck.x).toBe(115);
    const deepest = deckPosition(g.deck, 19, 13);
    expect(deepest.y + g.deck.r).toBeCloseTo(430);
  });

  it("keeps the ten columns collected by hand inside the left strip", () => {
    const tenth = deckPosition(g.deck, 9, 0);
    expect(tenth.x - g.deck.r).toBeGreaterThan(0);
  });
});

describe("deckPosition", () => {
  it("moves each column half a neuron left and down", () => {
    const deck = { x: 100, ys: [50, 70], r: 8 };
    expect(deckPosition(deck, 0, 1)).toEqual({ x: 100, y: 70 });
    expect(deckPosition(deck, 3, 1)).toEqual({ x: 76, y: 94 });
  });
});
