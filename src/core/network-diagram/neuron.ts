/** One neuron: a unit of a drawn column, in the network's math (not its drawn row). */
export interface NeuronRef {
  column: number;
  unit: number;
}

/** The neurons that have a ring, each for its own reason. One neuron can have several. */
export interface NeuronRings {
  hovered?: NeuronRef;
  pinned?: NeuronRef;
  /** Keyboard focus only: see `NeuronInteraction.onFocusChange`. */
  focused?: NeuronRef;
}

/** Output units top to bottom: Approach (class 1) above Wait (class 0), as in the prototype. */
export const OUTPUT_ORDER = [1, 0];

export function sameNeuron(a: NeuronRef | undefined, b: NeuronRef | undefined): boolean {
  return a !== undefined && a.column === b?.column && a.unit === b.unit;
}

/** The unit drawn in a row: rows are units, except in the output column, which follows OUTPUT_ORDER. */
export function unitAt(column: number, row: number, lastColumn: number): number {
  return column === lastColumn ? OUTPUT_ORDER[row] : row;
}

/** The row a unit is drawn in: the inverse of `unitAt`. */
export function rowOf(column: number, unit: number, lastColumn: number): number {
  return column === lastColumn ? OUTPUT_ORDER.indexOf(unit) : unit;
}

/**
 * What the lesson calls a neuron, such as "Hidden Layer 1 Neuron 3". An output neuron is named by
 * its class instead: "Output Layer: Approach".
 */
export function neuronName(neuron: NeuronRef, lastColumn: number, outputLabels: Record<number, string>): string {
  if (neuron.column === lastColumn) {
    const label = outputLabels[neuron.unit];
    return `Output Layer: ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }
  const layer = neuron.column === 0 ? "Input Layer" : `Hidden Layer ${neuron.column}`;
  return `${layer} Neuron ${neuron.unit + 1}`;
}

/** An activation to two decimals, with a real minus sign (U+2212) for negatives: "−0.42". */
export function formatActivation(value: number): string {
  return (value < 0 ? "\u2212" : "") + Math.abs(value).toFixed(2);
}
