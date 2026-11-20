import { layoutNetwork } from "./layout";
import { neuronAfterKey } from "./neuron-navigation";

describe("neuronAfterKey", () => {
  const layout = layoutNetwork([10, 8, 6, 2], 537, 440);

  /** The row in `column` whose drawn y is nearest `y`, the upper row on a tie. */
  function nearestRow(column: number, y: number) {
    let best = 0;
    layout.nodes[column].forEach((node, row) => {
      if (Math.abs(node.y - y) < Math.abs(layout.nodes[column][best].y - y)) {
        best = row;
      }
    });
    return best;
  }

  it("moves up and down a column and stops at its ends", () => {
    expect(neuronAfterKey({ column: 0, unit: 3 }, "ArrowDown", layout, 4)).toEqual({ column: 0, unit: 4 });
    expect(neuronAfterKey({ column: 0, unit: 3 }, "ArrowUp", layout, 4)).toEqual({ column: 0, unit: 2 });
    expect(neuronAfterKey({ column: 0, unit: 0 }, "ArrowUp", layout, 4)).toEqual({ column: 0, unit: 0 });
    expect(neuronAfterKey({ column: 0, unit: 9 }, "ArrowDown", layout, 4)).toEqual({ column: 0, unit: 9 });
  });

  it("goes down the outputs in drawn order, Approach then Wait", () => {
    expect(neuronAfterKey({ column: 3, unit: 1 }, "ArrowDown", layout, 4)).toEqual({ column: 3, unit: 0 });
    expect(neuronAfterKey({ column: 3, unit: 0 }, "ArrowUp", layout, 4)).toEqual({ column: 3, unit: 1 });
    expect(neuronAfterKey({ column: 3, unit: 1 }, "ArrowUp", layout, 4)).toEqual({ column: 3, unit: 1 });
  });

  it("moves sideways to the nearest neuron by height in a reached column", () => {
    // Input unit 0 is the top node; its nearest hidden-1 neighbor by height is computed from the layout.
    const fromTop = layout.nodes[0][0].y;
    expect(neuronAfterKey({ column: 0, unit: 0 }, "ArrowRight", layout, 4))
      .toEqual({ column: 1, unit: nearestRow(1, fromTop) });
    expect(nearestRow(1, fromTop)).toBe(0);

    const hidden2Y = layout.nodes[2][3].y;
    const nearestOutputRow = nearestRow(3, hidden2Y);
    expect(neuronAfterKey({ column: 2, unit: 3 }, "ArrowRight", layout, 4))
      .toEqual({ column: 3, unit: nearestOutputRow === 0 ? 1 : 0 });

    // And back left from an output, by height.
    const approachY = layout.nodes[3][0].y;
    expect(neuronAfterKey({ column: 3, unit: 1 }, "ArrowLeft", layout, 4))
      .toEqual({ column: 2, unit: nearestRow(2, approachY) });
  });

  it("sends a tie in height to the upper neuron", () => {
    // The middle of three nodes is level with the midpoint of the two outputs.
    const small = layoutNetwork([3, 2], 537, 440);
    expect(small.nodes[0][1].y).toBeCloseTo((small.nodes[1][0].y + small.nodes[1][1].y) / 2);
    // The upper output row is Approach (unit 1).
    expect(neuronAfterKey({ column: 0, unit: 1 }, "ArrowRight", small, 2)).toEqual({ column: 1, unit: 1 });
  });

  it("stops at the ends of the reached columns", () => {
    expect(neuronAfterKey({ column: 0, unit: 2 }, "ArrowLeft", layout, 4)).toEqual({ column: 0, unit: 2 });
    expect(neuronAfterKey({ column: 3, unit: 0 }, "ArrowRight", layout, 4)).toEqual({ column: 3, unit: 0 });
  });

  it("doesn't move into a column the steps haven't reached", () => {
    expect(neuronAfterKey({ column: 1, unit: 0 }, "ArrowRight", layout, 2)).toEqual({ column: 1, unit: 0 });
    expect(neuronAfterKey({ column: 0, unit: 5 }, "ArrowRight", layout, 1)).toEqual({ column: 0, unit: 5 });
  });

  it("goes to the first or last in its column on Home and End", () => {
    expect(neuronAfterKey({ column: 1, unit: 4 }, "Home", layout, 4)).toEqual({ column: 1, unit: 0 });
    expect(neuronAfterKey({ column: 1, unit: 4 }, "End", layout, 4)).toEqual({ column: 1, unit: 7 });
    // The output column's first drawn neuron is Approach, its last is Wait.
    expect(neuronAfterKey({ column: 3, unit: 0 }, "Home", layout, 4)).toEqual({ column: 3, unit: 1 });
    expect(neuronAfterKey({ column: 3, unit: 1 }, "End", layout, 4)).toEqual({ column: 3, unit: 0 });
  });

  it("leaves other keys alone", () => {
    expect(neuronAfterKey({ column: 0, unit: 0 }, "Tab", layout, 4)).toBeUndefined();
    expect(neuronAfterKey({ column: 0, unit: 0 }, "Enter", layout, 4)).toBeUndefined();
  });
});
