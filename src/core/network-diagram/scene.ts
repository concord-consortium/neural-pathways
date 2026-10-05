/**
 * Opacity, 0–1. `hidden`: the nodes of the hidden layers, every column but the first and last.
 * `rest`: everything else. Extract Pathways dims the network around its hidden neurons.
 */
export interface Dim {
  rest: number;
  hidden: number;
}

/**
 * What a network diagram shows at one moment. Views build scenes; NetworkDiagram draws them.
 * Columns are the drawn layers, left to right, indexed by unit. Gap g joins column g to column
 * g + 1.
 */
export interface Scene {
  /** [column][unit], 0–1: how much of each node's value its gauge shows. */
  nodeFill: number[][];
  /**
   * [gap][source unit], 0–1: how far the edges leaving that unit are drawn. 0–0.5 draws the near
   * half, which shows the source's activation; 0.5–1 draws the far half, activation × weight.
   */
  edgeDraw: number[][];
  /** [gap]: whether the gap's "× weight" caption is shown. */
  weightLabel: boolean[];
  /** 0: the answer is hidden. Between 0 and 1: the winning pill's pop. 1: revealed. */
  answer: number;
  /** How strongly each part of the diagram is drawn. 1 is full strength. */
  dim: Dim;
}

function uniformScene(columnSizes: readonly number[], value: 0 | 1): Scene {
  const gaps = columnSizes.slice(0, -1);
  return {
    nodeFill: columnSizes.map(n => new Array<number>(n).fill(value)),
    edgeDraw: gaps.map(n => new Array<number>(n).fill(value)),
    weightLabel: gaps.map(() => value === 1),
    answer: value,
    dim: { rest: 1, hidden: 1 },
  };
}

/** Nothing drawn: gray wires and empty nodes. */
export function emptyScene(columnSizes: readonly number[]): Scene {
  return uniformScene(columnSizes, 0);
}

/** Everything drawn and the answer revealed. */
export function fullScene(columnSizes: readonly number[]): Scene {
  return uniformScene(columnSizes, 1);
}
