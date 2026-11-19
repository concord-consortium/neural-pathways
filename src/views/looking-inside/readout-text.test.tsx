import React from "react";
import { render, screen } from "@testing-library/react";
import { promptText, readoutText } from "./readout-text";

const labels = { 0: "wait", 1: "approach" };

function textOf(node: React.ReactNode): string {
  const container = document.createElement("div");
  render(node, { container });
  return container.textContent ?? "";
}

describe("promptText", () => {
  it.each([
    [0, "Click Step 1 to see how the message is represented by activation values " +
      "of the neurons in the Input Layer."],
    [1, "The message has been represented as activation values of the neurons in the Input Layer. " +
      "Click any neuron in the Input Layer to see its activation value."],
    [2, "Click any neuron in the Input Layer or Hidden Layer 1 to see how data flows."],
    [3, "Click any neuron in the Input Layer, Hidden Layer 1, or Hidden Layer 2 " +
      "to see how data flows."],
    [4, "Click any neuron in any layer to see how data flows."]
  ])("prompts at marker %i", (marker, text) => {
    expect(textOf(promptText(marker))).toBe(text);
  });

  it("bolds Step 1 at marker 0", () => {
    render(<div>{promptText(0)}</div>);
    expect(screen.getByText("Step 1").tagName).toBe("B");
  });
});

describe("readoutText", () => {
  it("reads out an input with its value only at Step 1", () => {
    expect(textOf(readoutText({ column: 0, unit: 2 }, 1, -0.4249, 3, labels)))
      .toBe("Input Layer Neuron 3: Activation = −0.42");
  });

  it("adds the input's sentence from Step 2 on", () => {
    expect(textOf(readoutText({ column: 0, unit: 2 }, 2, -0.4249, 3, labels)))
      .toBe("Input Layer Neuron 3: Activation = −0.42. This value is multiplied by different weights " +
        "before being passed to the Hidden Layer 1 neurons.");
  });

  it("bolds the neuron's name", () => {
    render(<div>{readoutText({ column: 1, unit: 0 }, 2, 0.5, 3, labels)}</div>);
    expect(screen.getByText("Hidden Layer 1 Neuron 1").tagName).toBe("B");
  });

  it("says where a hidden neuron's value comes from", () => {
    expect(textOf(readoutText({ column: 1, unit: 0 }, 2, 0.5, 3, labels)))
      .toBe("Hidden Layer 1 Neuron 1: Activation = 0.50. Data from the Input Layer neurons is weighted " +
        "and combined to set this neuron's activation value.");
    expect(textOf(readoutText({ column: 2, unit: 0 }, 3, 0.5, 3, labels)))
      .toBe("Hidden Layer 2 Neuron 1: Activation = 0.50. Data from the Hidden Layer 1 neurons is weighted " +
        "and combined to set this neuron's activation value.");
  });

  it("says what an output's value is, without a head", () => {
    expect(textOf(readoutText({ column: 3, unit: 1 }, 4, 0.9, 3, labels)))
      .toBe("Data from the neurons in the Hidden Layer 2 are weighted and combined " +
        "to determine the probability of “Approach”.");
    expect(textOf(readoutText({ column: 3, unit: 0 }, 4, 0.1, 3, labels))).toContain("“Wait”");
  });
});
