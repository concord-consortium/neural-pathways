import { Network } from "./network";
import { ForwardPass } from "./forward";
import { magnitudeBand, networkScales } from "./network-scales";

// One drawn gap: a 1-unit layer feeding a 2-unit layer with weights 2 and -1.
const network: Network = {
  vocabulary: ["a"],
  layers: [
    { activation: "tanh", biases: [0], weights: [[1]] },
    { activation: "linear", biases: [0, 0], weights: [[2], [-1]] },
  ],
};

function pass(activation: number, logits: number[]): ForwardPass {
  return { input: [1], layers: [[activation], logits] };
}

describe("networkScales", () => {
  it("cuts each gap's pooled magnitudes into terciles", () => {
    // Pool per pass: |a|, |2a|, |-a|. Sorted over all three passes:
    // 0.1 0.1 0.2 0.2 0.2 0.3 0.3 0.4 0.6, so the cuts sit at positions 3 and 6.
    const scales = networkScales(network, [pass(0.1, [0, 0]), pass(-0.2, [0, 0]), pass(0.3, [0, 0])]);
    expect(scales.edgeThresholds).toEqual([[0.2, 0.3]]);
  });

  it("scales the logits by the largest magnitude", () => {
    const scales = networkScales(network, [pass(0.1, [0.5, -1.5]), pass(0.1, [1.2, 0.4])]);
    expect(scales.logitScale).toBe(1.5);
  });

  it("falls back to harmless values with no passes", () => {
    expect(networkScales(network, [])).toEqual({ edgeThresholds: [[0, 0]], logitScale: 1 });
  });

  it("has one pair of thresholds per drawn gap", () => {
    const deeper: Network = {
      vocabulary: ["a"],
      layers: [network.layers[0], { activation: "tanh", biases: [0], weights: [[1]] }, network.layers[1]],
    };
    const scales = networkScales(deeper, [{ input: [1], layers: [[0.5], [0.5], [1, 1]] }]);
    expect(scales.edgeThresholds).toHaveLength(2);
  });
});

describe("magnitudeBand", () => {
  const thresholds = [0.2, 0.8] as const;

  it("bands by magnitude, ignoring sign", () => {
    expect(magnitudeBand(0.1, thresholds)).toBe(0);
    expect(magnitudeBand(-0.5, thresholds)).toBe(1);
    expect(magnitudeBand(-0.9, thresholds)).toBe(2);
  });

  it("puts a value on a threshold in the band above", () => {
    expect(magnitudeBand(0.2, thresholds)).toBe(1);
    expect(magnitudeBand(-0.8, thresholds)).toBe(2);
  });

  it("puts zero in the thinnest band", () => {
    expect(magnitudeBand(0, thresholds)).toBe(0);
  });

  it("puts zero in the thinnest band even when a threshold is zero", () => {
    expect(magnitudeBand(0, [0, 0])).toBe(0);
    expect(magnitudeBand(-0, [0, 0.5])).toBe(0);
    expect(magnitudeBand(0.1, [0, 0])).toBe(2);
  });
});
