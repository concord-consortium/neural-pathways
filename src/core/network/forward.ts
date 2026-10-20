import { conversationWords } from "../conversation-text";
import { Network } from "./network";

export interface ForwardPass {
  /** How many times each vocabulary word appears, in vocabulary order. */
  input: number[];
  /** Each layer's output, in layer order. The last is the logits. */
  layers: number[][];
}

/** How many times each vocabulary word appears in `text`, in vocabulary order. Other words are ignored. */
export function wordCounts(vocabulary: readonly string[], text: string): number[] {
  const counts = new Map<string, number>();
  for (const word of conversationWords(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return vocabulary.map(word => counts.get(word) ?? 0);
}

/** Runs `text` through the network. A word feeds its count: used three times, it feeds 3. */
export function forward(network: Network, text: string): ForwardPass {
  const input = wordCounts(network.vocabulary, text);
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
