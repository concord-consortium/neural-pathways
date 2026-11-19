import React from "react";
import { render } from "@testing-library/react";
import { ActivationLegend } from "./activation-legend";

describe("ActivationLegend", () => {
  it("names what the colors show, then the two signs", () => {
    const { container } = render(<ActivationLegend />);
    expect(container).toHaveTextContent("Neuron Activation − +");
  });

  it("hides its two swatches from assistive technology, since the signs say the same", () => {
    const { container } = render(<ActivationLegend />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the swatches are hidden, so they have no role or text
    const swatches = container.querySelectorAll(".activation-legend__swatch");
    expect(swatches).toHaveLength(2);
    swatches.forEach(swatch => expect(swatch).toHaveAttribute("aria-hidden", "true"));
    expect(swatches[0]).toHaveClass("activation-legend__swatch--negative");
    expect(swatches[1]).toHaveClass("activation-legend__swatch--positive");
  });
});
