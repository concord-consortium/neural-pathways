import React from "react";
import { render, screen } from "@testing-library/react";
import { LoadingLegend } from "./loading-legend";

describe("LoadingLegend", () => {
  it("names the legend and its signs", () => {
    render(<LoadingLegend />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByText("−")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("hides the bars from assistive technology, since the signs say the same", () => {
    const { container } = render(<LoadingLegend />);
    // The bars are hidden, so they have no role or text.
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const bars = container.querySelector(".loading-legend__bars");
    expect(bars).toHaveAttribute("aria-hidden", "true");
  });
});
