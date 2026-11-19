import { NetworkLayout } from "./layout";
import { NeuronRef, rowOf, unitAt } from "./neuron";

/** Heights closer than this are a tie. */
const TIE = 1e-6;

/**
 * Where an arrow, Home or End key moves the keyboard focus from a neuron, or `undefined` for a key
 * that isn't about moving between neurons. At the edge of the reached neurons the result is `from`
 * itself. Up and Down follow the drawn rows; Left and Right go to the nearest neuron by height in
 * the next reached column, the upper one on a tie.
 */
export function neuronAfterKey(
  from: NeuronRef,
  key: string,
  layout: NetworkLayout,
  reachedColumns: number
): NeuronRef | undefined {
  const lastColumn = layout.nodes.length - 1;
  const row = rowOf(from.column, from.unit, lastColumn);
  const lastRow = layout.nodes[from.column].length - 1;

  const inColumn = (toRow: number): NeuronRef => ({
    column: from.column,
    unit: unitAt(from.column, Math.max(0, Math.min(lastRow, toRow)), lastColumn),
  });

  switch (key) {
    case "ArrowUp": return inColumn(row - 1);
    case "ArrowDown": return inColumn(row + 1);
    case "Home": return inColumn(0);
    case "End": return inColumn(lastRow);
    case "ArrowLeft":
    case "ArrowRight": {
      const column = from.column + (key === "ArrowLeft" ? -1 : 1);
      if (column < 0 || column >= reachedColumns || column > lastColumn) {
        return from;
      }
      const y = layout.nodes[from.column][row].y;
      let nearest = 0;
      layout.nodes[column].forEach((node, r) => {
        if (Math.abs(node.y - y) < Math.abs(layout.nodes[column][nearest].y - y) - TIE) {
          nearest = r;
        }
      });
      return { column, unit: unitAt(column, nearest, lastColumn) };
    }
    default: return undefined;
  }
}
