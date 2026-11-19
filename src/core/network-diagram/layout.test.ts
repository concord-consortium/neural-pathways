import { layoutNetwork, MIN_HEIGHT, MIN_WIDTH } from "./layout";
import { PILL_GROW, popScale } from "./network-drawing";

const SIZES = [10, 8, 6, 2];
/** The largest scale the winning pill pops to, about 1.1. */
const POP_PEAK = Math.max(...Array.from({ length: 1001 }, (_, i) => popScale(i / 1000)));
/** Half the pill's 2 px stroke, which is drawn outside its box. */
const HALF_STROKE = 1;

describe.each([
  [MIN_WIDTH, MIN_HEIGHT],
  [537, 440],
  [1200, 900],
])("layoutNetwork at %i × %i", (width, height) => {
  const layout = layoutNetwork(SIZES, width, height);
  const { radius: r } = layout;

  it("keeps the radius between 5 and 12", () => {
    expect(r).toBeGreaterThanOrEqual(5);
    expect(r).toBeLessThanOrEqual(12);
  });

  it("has one node per unit", () => {
    expect(layout.nodes.map(column => column.length)).toEqual(SIZES);
  });

  it("keeps every node inside the drawing and below the captions", () => {
    for (const column of layout.nodes) {
      for (const node of column) {
        expect(node.x - r).toBeGreaterThanOrEqual(0);
        expect(node.x + r).toBeLessThanOrEqual(layout.width);
        expect(node.y - r).toBeGreaterThan(layout.captionY);
        expect(node.y + r).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("keeps the nodes in a column apart", () => {
    for (const column of layout.nodes) {
      for (let i = 1; i < column.length; i++) {
        expect(column[i].y - column[i - 1].y).toBeGreaterThanOrEqual(2 * r);
      }
    }
  });

  it("keeps the columns in order and apart", () => {
    for (let i = 1; i < layout.columnX.length; i++) {
      expect(layout.columnX[i] - layout.columnX[i - 1]).toBeGreaterThanOrEqual(4 * r);
    }
  });

  it("puts one pill around each output node, inside the drawing, without overlapping", () => {
    const outputs = layout.nodes[SIZES.length - 1];
    expect(layout.pills).toHaveLength(outputs.length);
    layout.pills.forEach((pill, i) => {
      expect(pill.x).toBeLessThanOrEqual(outputs[i].x - r);
      expect(pill.y).toBeLessThanOrEqual(outputs[i].y - r);
      expect(pill.y + pill.height).toBeGreaterThanOrEqual(outputs[i].y + r);
      expect(pill.x + pill.width).toBeLessThanOrEqual(layout.width);
      expect(pill.y - 12).toBeGreaterThan(layout.captionY);
    });
  });

  // The winning pill grows and pops about its center, into the gap but not across it.
  it("leaves the gap between the pills wider than the winning pill pops into it", () => {
    const [upper, lower] = layout.pills;
    const gap = lower.y - (upper.y + upper.height);
    // The prototype's OUT_PILL_GAP.
    expect(gap).toBeCloseTo(10);
    const popInto = (upper.height / 2 + PILL_GROW + HALF_STROKE) * POP_PEAK - upper.height / 2;
    expect(popInto).toBeLessThan(gap);
  });

  // See PILL_POP_ROOM in layout.ts.
  it("leaves room for the winning pill to pop without leaving the drawing", () => {
    for (const pill of layout.pills) {
      const popped = (pill.width / 2 + PILL_GROW + HALF_STROKE) * POP_PEAK;
      expect(pill.x + pill.width / 2 + popped).toBeLessThanOrEqual(layout.width);
    }
  });
});

describe("layoutNetwork", () => {
  it("clamps to the minimum size", () => {
    const layout = layoutNetwork(SIZES, 100, 50);
    expect(layout.width).toBe(MIN_WIDTH);
    expect(layout.height).toBe(MIN_HEIGHT);
  });

  it("draws the neurons at radius 7 in the smallest layout, and at 10 in a 300 px one", () => {
    expect(layoutNetwork(SIZES, MIN_WIDTH, MIN_HEIGHT).radius).toBe(7);
    expect(layoutNetwork(SIZES, MIN_WIDTH, 300).radius).toBe(10);
  });

  it("spaces nodes 30 apart at most and centers the diagram in a tall space", () => {
    const layout = layoutNetwork(SIZES, 537, 1000);
    const first = layout.nodes[0];
    expect(first[1].y - first[0].y).toBeCloseTo(30);
    const middle = (first[0].y + first[first.length - 1].y) / 2;
    expect(Math.abs(middle - (44 + (1000 - 14)) / 2)).toBeLessThan(1);
  });
});
