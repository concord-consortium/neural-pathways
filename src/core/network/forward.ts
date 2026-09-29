import { Network } from "./network";

export interface ForwardPass {
  /** 0/1 word presence, in vocabulary order. */
  input: number[];
  /** Each layer's output, in layer order. The last is the logits. */
  layers: number[][];
}

/** Runs `text` through the network. A word counts once however often it appears. */
export function forward(network: Network, text: string): ForwardPass {
  const words = new Set(text.split(/\s+/));
  const input = network.vocabulary.map(word => (words.has(word) ? 1 : 0));
  const layers: number[][] = [];
  let previous: number[] = input;
  for (const layer of network.layers) {
    const inputs = previous;
    const values = layer.weights.map((row, j) => {
      let sum = layer.biases[j];
      for (let i = 0; i < inputs.length; i++) {
        sum += inputs[i] * row[i];
      }
      return layer.activation === "tanh" ? Math.tanh(sum) : sum;
    });
    layers.push(values);
    previous = values;
  }
  return { input, layers };
}

/** The class with the largest logit; the first on a tie. */
export function predictedClass(pass: ForwardPass): number {
  const logits = pass.layers[pass.layers.length - 1];
  let best = 0;
  for (let i = 1; i < logits.length; i++) {
    if (logits[i] > logits[best]) {
      best = i;
    }
  }
  return best;
}
