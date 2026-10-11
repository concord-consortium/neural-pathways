import React from "react";
import { render, screen } from "@testing-library/react";
import { ActualLabel } from "./actual-label";

const labels = { 0: "wait", 1: "approach" };

describe("ActualLabel", () => {
  it("shows an approach chip", () => {
    const { container } = render(<ActualLabel target={1} labels={labels} />);
    expect(container).toHaveTextContent("Actual Label approach");
    expect(screen.getByText("approach")).toHaveClass("actual-label__pill--approach");
  });

  // 0 is a real label, not a missing one.
  it("shows a wait chip", () => {
    const { container } = render(<ActualLabel target={0} labels={labels} />);
    expect(container).toHaveTextContent("Actual Label wait");
    expect(screen.getByText("wait")).toHaveClass("actual-label__pill--wait");
  });

  it("shows the number for a value with no label", () => {
    render(<ActualLabel target={2} labels={labels} />);
    expect(screen.getByText("2")).toHaveClass("actual-label__pill");
  });

  it("shows nothing when the conversation has no label", () => {
    const { container } = render(<ActualLabel target={null} labels={labels} />);
    expect(container).toBeEmptyDOMElement();
  });
});
