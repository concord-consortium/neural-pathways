import { toyNetwork } from "./toy-network";

describe("toyNetwork", () => {
  it("reads 30 distinct words in alphabetical order", () => {
    const { vocabulary } = toyNetwork;
    expect(vocabulary).toHaveLength(30);
    expect(new Set(vocabulary).size).toBe(30);
    expect([...vocabulary].sort()).toEqual(vocabulary);
  });

  it("has an embedding of 10, hidden layers of 8 and 6, and 2 outputs", () => {
    expect(toyNetwork.layers.map(layer => layer.biases.length)).toEqual([10, 8, 6, 2]);
    expect(toyNetwork.layers.map(layer => layer.activation)).toEqual(["tanh", "tanh", "tanh", "linear"]);
  });

  it("has one weight row per unit, each as long as the layer before", () => {
    let inputs = toyNetwork.vocabulary.length;
    for (const layer of toyNetwork.layers) {
      expect(layer.weights).toHaveLength(layer.biases.length);
      for (const row of layer.weights) {
        expect(row).toHaveLength(inputs);
      }
      inputs = layer.biases.length;
    }
  });
});
