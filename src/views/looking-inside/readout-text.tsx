import React from "react";
import { formatActivation, neuronName, NeuronRef } from "../../core/network-diagram/neuron";

/** What the box says under the network when nothing is pinned, by the marker the timeline rests at. */
export function promptText(marker: number): React.ReactNode {
  switch (marker) {
    case 0:
      return (
        <>
          Click <b>Step 1</b> to see how the message is represented by activation values of the neurons
          in the Input Layer.
        </>
      );
    case 1:
      return "The message has been represented as activation values of the neurons in the Input Layer. " +
        "Click any neuron in the Input Layer to see its activation value.";
    case 2:
      return "Click any neuron in the Input Layer or Hidden Layer 1 to see how data flows.";
    case 3:
      return "Click any neuron in the Input Layer, Hidden Layer 1, or Hidden Layer 2 to see how data flows.";
    default:
      return "Click any neuron in any layer to see how data flows.";
  }
}

function layerName(column: number): string {
  return column === 0 ? "Input Layer" : `Hidden Layer ${column}`;
}

/** The sentence after a neuron's value, or "" where its layer has none yet at this marker. */
function readoutSentence(
  neuron: NeuronRef, marker: number, lastColumn: number, outputLabels: Record<number, string>
): string {
  const { column } = neuron;
  if (column === lastColumn) {
    const label = outputLabels[neuron.unit];
    const name = `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
    return `Data from the neurons in the ${layerName(column - 1)} are weighted and combined ` +
      `to determine the probability of “${name}”.`;
  }
  // A layer's data is first on screen at the step that fills it: the input layer's at Step 2, where
  // its values start to be multiplied, and a hidden layer's at the step that computes it.
  if (marker < Math.max(2, column + 1)) return "";
  if (column === 0) {
    return "This value is multiplied by different weights before being passed to the Hidden Layer 1 neurons.";
  }
  return `Data from the ${layerName(column - 1)} neurons is weighted and combined ` +
    "to set this neuron's activation value.";
}

/**
 * A pinned neuron's readout: its name and activation, then a sentence on where the value comes from.
 * An output neuron has no head, only the sentence, which names its class.
 */
export function readoutText(
  neuron: NeuronRef, marker: number, value: number, lastColumn: number, outputLabels: Record<number, string>
): React.ReactNode {
  const sentence = readoutSentence(neuron, marker, lastColumn, outputLabels);
  if (neuron.column === lastColumn) return sentence;
  return (
    <>
      <b>{neuronName(neuron, lastColumn, outputLabels)}</b>: Activation = {formatActivation(value)}
      {sentence && `. ${sentence}`}
    </>
  );
}
