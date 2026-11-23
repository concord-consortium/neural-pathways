import { canvasLayout, deckPosition, extractGeometry, minCanvasWidth } from "./extract-geometry";
import { MAX_COLLECTED } from "./extract-steps";

const SIZES = [10, 8, 6, 2];
/** The narrowest canvas for these sizes. */
const NARROWEST = 881;

describe("minCanvasWidth", () => {
  it("is the narrowest the strips allow, and its room holds the finished deck, 10 clear each side", () => {
    expect(minCanvasWidth(SIZES)).toBe(NARROWEST);
    const room = (width: number) => {
      const g = canvasLayout(SIZES, width);
      return g.lifted.x - g.lifted.r;
    };
    const needed = 7.6 * 99 + 2 * 10;
    expect(room(NARROWEST)).toBeGreaterThanOrEqual(needed);
  });

  it("holds the ten columns collected by hand in the left strip, at least 10 clear", () => {
    const g = extractGeometry(SIZES, 0);
    const last = deckPosition(g.deck, MAX_COLLECTED - 1, 0);
    expect(last.x - g.deck.r).toBeGreaterThanOrEqual(10);
  });

  it("lays out a host one pixel narrower at the minimum, and one pixel wider at its own width", () => {
    expect(extractGeometry(SIZES, NARROWEST - 1).width).toBe(NARROWEST);
    expect(extractGeometry(SIZES, NARROWEST).width).toBe(NARROWEST);
    expect(extractGeometry(SIZES, NARROWEST + 1).width).toBe(NARROWEST + 1);
  });
});

describe("extractGeometry", () => {
  // The width the prototype's canvas had in the window it was built in.
  const g = extractGeometry(SIZES, 995);

  it("centers the 537-wide network with a strip each side", () => {
    expect(g.width).toBe(995);
    expect(g.height).toBe(404);
    expect(g.networkX).toBe(229);
    expect(g.network.width).toBe(537);
    expect(g.network.radius).toBe(12);
  });

  it("lays out at the host's width in whole pixels, but no narrower than its minimum", () => {
    expect(extractGeometry(SIZES, 600).width).toBe(NARROWEST);
    expect(extractGeometry(SIZES, 600).networkX).toBe(172);
    expect(extractGeometry(SIZES, 980.6).width).toBe(980);
    const wide = extractGeometry(SIZES, 1300);
    expect(wide.width).toBe(1300);
    expect(wide.networkX).toBe(382);
  });

  it("lists the 14 hidden nodes in canvas coordinates, Hidden Layer 1's first", () => {
    expect(g.hidden).toHaveLength(14);
    expect(g.hidden[0]).toEqual({ x: g.network.nodes[1][0].x + 229, y: g.network.nodes[1][0].y });
    expect(g.hidden[8]).toEqual({ x: g.network.nodes[2][0].x + 229, y: g.network.nodes[2][0].y });
  });

  it("stands the lifted column in the middle of the right strip, 25.8 apart, under its label", () => {
    expect(g.lifted.x).toBe(881);
    expect(g.lifted.r).toBeCloseTo(78 / 7);
    expect(g.lifted.ys[0]).toBe(48);
    expect(g.lifted.ys[13]).toBeCloseTo(382.857);
    expect((g.lifted.ys[13] - g.lifted.ys[0]) / 13).toBeCloseTo(25.758);
    expect(g.lifted.ys[13] + g.lifted.r).toBeLessThanOrEqual(404 - 10);
  });

  it("sizes the deck for 20 columns and starts it in the middle of the left strip", () => {
    expect(g.deck.r).toBe(7.6);
    expect(g.deck.ys[0]).toBeCloseTo(43.6);
    expect(g.deck.x).toBe(115);
    const deepest = deckPosition(g.deck, 19, 13);
    expect(deepest.y + g.deck.r).toBeCloseTo(394);
  });
});

describe("deckPosition", () => {
  it("moves each column half a neuron left and down", () => {
    const deck = { x: 100, ys: [50, 70], r: 8 };
    expect(deckPosition(deck, 0, 1)).toEqual({ x: 100, y: 70 });
    expect(deckPosition(deck, 3, 1)).toEqual({ x: 76, y: 94 });
  });
});
