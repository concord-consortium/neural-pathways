import { formatActivation, neuronName, rowOf, sameNeuron, unitAt } from "./neuron";

const LABELS = { 0: "wait", 1: "approach" };

describe("neuron helpers", () => {
  it("names hidden neurons by layer and one-based position", () => {
    expect(neuronName({ column: 1, unit: 2 }, 3, LABELS)).toBe("Hidden Layer 1 Neuron 3");
  });

  it("names output neurons by their capitalized class label", () => {
    expect(neuronName({ column: 3, unit: 1 }, 3, LABELS)).toBe("Output Layer: Approach");
    expect(neuronName({ column: 3, unit: 0 }, 3, LABELS)).toBe("Output Layer: Wait");
  });

  it("formats activations to two decimals with a true minus sign", () => {
    expect(formatActivation(-0.4249)).toBe("−0.42");
    expect(formatActivation(0.425)).toBe("0.43");
    expect(formatActivation(-0.001)).toBe("0.00");
  });

  it("maps between rows and units, reversing only the output column", () => {
    expect(rowOf(3, 1, 3)).toBe(0);
    expect(rowOf(1, 4, 3)).toBe(4);
    expect(unitAt(3, 0, 3)).toBe(1);
    expect(unitAt(1, 4, 3)).toBe(4);
  });

  it("compares neurons by column and unit, and never equates a missing one", () => {
    expect(sameNeuron({ column: 1, unit: 2 }, { column: 1, unit: 2 })).toBe(true);
    expect(sameNeuron({ column: 1, unit: 2 }, { column: 2, unit: 2 })).toBe(false);
    expect(sameNeuron(undefined, undefined)).toBe(false);
  });
});
