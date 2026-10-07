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

  it("cuts each drawn gap from its own pool", () => {
    // Gap 0 has weight 2, gap 1 the weights 2 and -1 above.
    const deeper: Network = {
      vocabulary: ["a"],
      layers: [network.layers[0], { activation: "tanh", biases: [0], weights: [[2]] }, network.layers[1]],
    };
    const passes = [[0.25, 0.125], [0.5, 0.375], [0.75, 0.625]].map(([a, b]) => ({
      input: [1], layers: [[a], [b], [0, 0]],
    }));
    // Gap 0 pools |a| and |2a|: 0.25 0.5 0.5 0.75 1 1.5, cut at positions 2 and 4.
    // Gap 1 pools |b|, |2b| and |-b|: 0.125 0.125 0.25 0.375 0.375 0.625 0.625 0.75 1.25, cut at 3 and 6.
    expect(networkScales(deeper, passes).edgeThresholds).toEqual([[0.5, 1], [0.375, 0.625]]);
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

  it("puts zero in the thin band", () => {
    expect(magnitudeBand(0, thresholds)).toBe(0);
  });

  it("puts zero in the thin band even when a threshold is zero", () => {
    expect(magnitudeBand(0, [0, 0])).toBe(0);
    expect(magnitudeBand(-0, [0, 0.5])).toBe(0);
    expect(magnitudeBand(0.1, [0, 0])).toBe(2);
  });
});
