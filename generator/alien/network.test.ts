import { pearson } from "../../src/core/math/statistics";
import { forward } from "../../src/core/network/forward";
import { NetworkConfig } from "./config-types";
import { fitNetwork, NetworkTrainingInput } from "./network";
import { createRng } from "./rng";

// Sixty made-up conversations of six words from four, so most repeat a word. Two neurons the words
// determine, standardized, and a class the words determine too.
const VOCABULARY = ["a", "b", "c", "d"];
const rng = createRng(7);
const texts = Array.from({ length: 60 }, () =>
  Array.from({ length: 6 }, () => VOCABULARY[rng.int(0, 3)]).join(" "));
const count = (text: string, word: string) => text.split(" ").filter(w => w === word).length;
const raw = texts.map(t => [count(t, "a") - count(t, "b"), count(t, "c") - count(t, "d")]);
const standardize = (column: number[]) => {
  const mean = column.reduce((sum, v) => sum + v, 0) / column.length;
  const sd = Math.sqrt(column.reduce((sum, v) => sum + (v - mean) ** 2, 0) / column.length);
  return column.map(v => (v - mean) / sd);
};
const columns = [0, 1].map(j => standardize(raw.map(row => row[j])));
const input: NetworkTrainingInput = {
  vocabulary: VOCABULARY,
  texts,
  targets: texts.map((_, s) => [columns[0][s], columns[1][s]]),
  classification: texts.map(t => (count(t, "a") + count(t, "c") > count(t, "b") + count(t, "d") ? 1 : 0)),
};
const CONFIG: NetworkConfig = {
  seed: 3, hiddenSizes: [4, 2], targetScale: 0.3, activationWeight: 5, classificationWeight: 0.5,
  learningRate: 0.03, margin: 0.1, checkEvery: 10, maxEpochs: 3000,
};

const fitted = fitNetwork(input, CONFIG);

/** How far each conversation's logit for its class beats the other's, through the app's forward pass. */
function margins(result: typeof fitted): number[] {
  return texts.map((text, s) => {
    const logits = forward(result.network, text).layers[result.network.layers.length - 1];
    const own = input.classification[s];
    return logits[own] - logits[1 - own];
  });
}

describe("fitNetwork", () => {
  it("lays out the words, the embedding, the tracking layer and two logits", () => {
    expect(fitted.network.vocabulary).toEqual(VOCABULARY);
    expect(fitted.network.layers.map(layer => layer.biases.length)).toEqual([4, 2, 2]);
    expect(fitted.network.layers.map(layer => layer.activation)).toEqual(["tanh", "tanh", "linear"]);
    expect(fitted.network.layers.map(layer => layer.weights[0].length)).toEqual([4, 4, 2]);
  });

  it("stops at the first check where every class wins by the margin", () => {
    expect(fitted.stoppedBy).toBe("margin");
    expect(fitted.epochs % CONFIG.checkEvery).toBe(0);
    expect(fitted.smallestMargin).toBeGreaterThanOrEqual(CONFIG.margin);
    expect(Math.min(...margins(fitted))).toBeCloseTo(fitted.smallestMargin, 12);
  });

  it("tracks its targets, read through the app's forward pass on word counts", () => {
    const tracking = forward(fitted.network, texts[0]).layers.length - 2;
    for (let j = 0; j < 2; j++) {
      const unit = texts.map(text => forward(fitted.network, text).layers[tracking][j]);
      expect(pearson(unit, input.targets.map(row => row[j])).r).toBeGreaterThan(0.9);
    }
  });

  it("is deterministic from its seed, and changes with it", () => {
    expect(fitNetwork(input, CONFIG).network).toEqual(fitted.network);
    expect(fitNetwork(input, { ...CONFIG, seed: 4 }).network).not.toEqual(fitted.network);
  });

  it("stops at maxEpochs when the margin is out of reach", () => {
    const capped = fitNetwork(input, { ...CONFIG, margin: 100, maxEpochs: 20 });
    expect(capped.stoppedBy).toBe("cap");
    expect(capped.epochs).toBe(20);
    expect(capped.smallestMargin).toBeLessThan(100);
  });
});
