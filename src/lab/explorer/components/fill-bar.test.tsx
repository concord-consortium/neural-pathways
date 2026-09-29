import React from "react";
import { render, screen } from "@testing-library/react";
import { FillBar } from "./fill-bar";

describe("FillBar", () => {
  it("renders a fill bar with correct width percentage", () => {
    render(<FillBar value={0.75} maxValue={1} testId="ev-0" />);
    const fill = screen.getByTestId("ev-0");
    expect(fill.style.width).toBe("75%");
  });

  it("clamps width to 100%", () => {
    render(<FillBar value={1.5} maxValue={1} testId="ev-0" />);
    const fill = screen.getByTestId("ev-0");
    expect(fill.style.width).toBe("100%");
  });

  it("renders label when provided", () => {
    render(<FillBar value={0.85} maxValue={1} label="85.0%" testId="ev-0" />);
    expect(screen.getByText("85.0%")).toBeDefined();
  });
});
