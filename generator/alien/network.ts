import { wordCounts } from "../../src/core/network/forward";
import { Network } from "../../src/core/network/network";
import { NetworkConfig } from "./config-types";
import { createRng } from "./rng";

export interface NetworkTrainingInput {
  /** The input words, in input order. */
  vocabulary: string[];
  /** One per conversation, as emitted, so training reads them as the app's forward pass does. */
  texts: string[];
  /** [conversation][neuron]: the authored standardized activations the tracking units follow. */
  targets: number[][];
  /** [conversation]: the class, 0 or 1, each conversation's outputs must favor. */
  classification: number[];
}

export interface FittedNetwork {
  network: Network;
  /** The epoch fitting stopped at. */
  epochs: number;
  /** Whether every conversation reached the margin, or maxEpochs ran out first. */
  stoppedBy: "margin" | "cap";
  /** How far the closest conversation's logit for its class beats the other's, when fitting stopped. */
  smallestMargin: number;
  trainingMs: number;
}

const BETA1 = 0.9;
const BETA2 = 0.999;
const EPSILON = 1e-8;
const CLASSES = 2;

/**
 * Fits words → hiddenSizes → 2 logits, indexed by class, by full-batch Adam on word counts. Each
 * hidden layer after the first tracks the next authored neurons, `targetScale` times their
 * standardized activations; the logits learn `classification` by softmax cross-entropy. Fitting
 * stops at the first check, every `checkEvery` epochs, where every conversation's logit for its
 * class beats the other's by `margin`, or at `maxEpochs`. Its only randomness is
 * `createRng(config.seed)`, which seeds the starting weights.
 *
 * The arithmetic matches forward() in src/core/network/forward.ts operation for operation, so the
 * margins fitting stops on are the ones the app computes.
 */
export function fitNetwork(input: NetworkTrainingInput, config: NetworkConfig): FittedNetwork {
  const started = Date.now();
  const { vocabulary, texts, targets, classification } = input;
  const n = texts.length;
  const sizes = [vocabulary.length, ...config.hiddenSizes, CLASSES];
  const layerCount = sizes.length - 1;
  const neuronCount = targets[0].length;
  const inputs = texts.map(text => Float64Array.from(wordCounts(vocabulary, text)));

  // Activation k is layer k's input: 0 the word counts, 1 the embedding, then the tracking layers,
  // then the logits. trackFrom[k] is the first neuron activation k's unit 0 tracks, or -1.
  const trackFrom = sizes.map(() => -1);
  let nextNeuron = 0;
  for (let k = 2; k < layerCount; k++) {
    trackFrom[k] = nextNeuron;
    nextNeuron += sizes[k];
  }

  // Weights are flat, [out][in] row-major, as forward() reads a layer's weights.
  const rng = createRng(config.seed);
  const weights = Array.from({ length: layerCount }, (_, l) => {
    const w = new Float64Array(sizes[l + 1] * sizes[l]);
    for (let k = 0; k < w.length; k++) w[k] = rng.normal() / Math.sqrt(sizes[l]);
    return w;
  });
  const biases = Array.from({ length: layerCount }, (_, l) => new Float64Array(sizes[l + 1]));
  const zerosLike = (arrays: Float64Array[]) => arrays.map(a => new Float64Array(a.length));
  const gradW = zerosLike(weights);
  const gradB = zerosLike(biases);
  const mW = zerosLike(weights);
  const vW = zerosLike(weights);
  const mB = zerosLike(biases);
  const vB = zerosLike(biases);
  const act = sizes.map(size => new Float64Array(size));
  const delta = sizes.map(size => new Float64Array(size));

  /** Runs conversation `s` forward, leaving every activation in `act`. */
  function run(s: number): void {
    act[0].set(inputs[s]);
    for (let l = 0; l < layerCount; l++) {
      const inN = sizes[l];
      const prev = act[l];
      const out = act[l + 1];
      const w = weights[l];
      for (let j = 0; j < sizes[l + 1]; j++) {
        let sum = biases[l][j];
        for (let i = 0; i < inN; i++) sum += prev[i] * w[j * inN + i];
        out[j] = l < layerCount - 1 ? Math.tanh(sum) : sum;
      }
    }
  }

  function smallestMargin(): number {
    let smallest = Infinity;
    for (let s = 0; s < n; s++) {
      run(s);
      const logits = act[layerCount];
      smallest = Math.min(smallest, logits[classification[s]] - logits[1 - classification[s]]);
    }
    return smallest;
  }

  function adam(p: Float64Array, g: Float64Array, m: Float64Array, v: Float64Array, c1: number, c2: number): void {
    for (let k = 0; k < p.length; k++) {
      const gk = g[k] / n;
      m[k] = BETA1 * m[k] + (1 - BETA1) * gk;
      v[k] = BETA2 * v[k] + (1 - BETA2) * gk * gk;
      p[k] -= (config.learningRate * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + EPSILON);
    }
  }

  /** One full-batch step: every conversation's gradient, then one Adam update. */
  function step(epoch: number): void {
    gradW.forEach(g => g.fill(0));
    gradB.forEach(g => g.fill(0));
    for (let s = 0; s < n; s++) {
      run(s);
      const logits = act[layerCount];
      const p1 = 1 / (1 + Math.exp(logits[0] - logits[1]));
      delta[layerCount][0] = config.classificationWeight * ((1 - p1) - (classification[s] === 0 ? 1 : 0));
      delta[layerCount][1] = config.classificationWeight * (p1 - (classification[s] === 1 ? 1 : 0));
      for (let l = layerCount - 1; l >= 0; l--) {
        const inN = sizes[l];
        const outN = sizes[l + 1];
        const prev = act[l];
        const d = delta[l + 1];
        const w = weights[l];
        const g = gradW[l];
        for (let j = 0; j < outN; j++) {
          gradB[l][j] += d[j];
          for (let i = 0; i < inN; i++) g[j * inN + i] += d[j] * prev[i];
        }
        if (l === 0) break;
        // Back through layer l - 1's tanh, adding the tracking loss where activation l tracks.
        const back = delta[l];
        const from = trackFrom[l];
        for (let i = 0; i < inN; i++) {
          let sum = 0;
          for (let j = 0; j < outN; j++) sum += w[j * inN + i] * d[j];
          if (from >= 0) {
            const target = config.targetScale * targets[s][from + i];
            sum += (config.activationWeight * 2 * (prev[i] - target)) / neuronCount;
          }
          back[i] = sum * (1 - prev[i] * prev[i]);
        }
      }
    }
    const c1 = 1 - BETA1 ** epoch;
    const c2 = 1 - BETA2 ** epoch;
    for (let l = 0; l < layerCount; l++) {
      adam(weights[l], gradW[l], mW[l], vW[l], c1, c2);
      adam(biases[l], gradB[l], mB[l], vB[l], c1, c2);
    }
  }

  let epochs = 0;
  let stoppedBy: FittedNetwork["stoppedBy"] = "cap";
  while (epochs < config.maxEpochs) {
    epochs++;
    step(epochs);
    if (epochs % config.checkEvery === 0 && smallestMargin() >= config.margin) {
      stoppedBy = "margin";
      break;
    }
  }

  const network: Network = {
    vocabulary: [...vocabulary],
    layers: weights.map((w, l) => ({
      weights: Array.from({ length: sizes[l + 1] }, (_, j) =>
        Array.from(w.subarray(j * sizes[l], (j + 1) * sizes[l]))),
      biases: Array.from(biases[l]),
      activation: l < layerCount - 1 ? "tanh" : "linear",
    })),
  };
  return { network, epochs, stoppedBy, smallestMargin: smallestMargin(), trainingMs: Date.now() - started };
}
