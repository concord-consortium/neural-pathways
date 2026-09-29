import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepRow } from "./step-row";

describe("StepRow", () => {
  it("shows Steps 1 to 4 and Reset", () => {
    render(<StepRow shownStep={0} onStep={jest.fn()} onReset={jest.fn()} />);
    for (const step of [1, 2, 3, 4]) {
      expect(screen.getByRole("button", { name: `Step ${step}` })).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "true");
  });

  it("presses the step shown and enables Reset", () => {
    render(<StepRow shownStep={3} onStep={jest.fn()} onReset={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Step 3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Reset" })).toHaveAttribute("aria-disabled", "false");
  });

  it("reports which step was clicked, and Reset", () => {
    const onStep = jest.fn();
    const onReset = jest.fn();
    render(<StepRow shownStep={1} onStep={onStep} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Step 4" }));
    expect(onStep).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not call onReset when Reset is clicked while shownStep is 0", () => {
    const onReset = jest.fn();
    render(<StepRow shownStep={0} onStep={jest.fn()} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).not.toHaveBeenCalled();
  });
});
