import { layoutNetwork, MIN_HEIGHT, MIN_WIDTH } from "./layout";

const SIZES = [10, 8, 6, 2];

describe.each([
  [380, 300],
  [537, 420],
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
    expect(layout.pills[1].y).toBeGreaterThanOrEqual(layout.pills[0].y + layout.pills[0].height + 12);
  });
});

describe("layoutNetwork", () => {
  it("clamps to the minimum size", () => {
    const layout = layoutNetwork(SIZES, 100, 50);
    expect(layout.width).toBe(MIN_WIDTH);
    expect(layout.height).toBe(MIN_HEIGHT);
  });

  it("spaces nodes 30 apart at most and centres the diagram in a tall space", () => {
    const layout = layoutNetwork(SIZES, 537, 1000);
    const first = layout.nodes[0];
    expect(first[1].y - first[0].y).toBeCloseTo(30);
    const middle = (first[0].y + first[first.length - 1].y) / 2;
    expect(Math.abs(middle - (44 + (1000 - 14)) / 2)).toBeLessThan(1);
  });
});
