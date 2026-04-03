import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./app";

describe("App component", () => {
  it("renders the review selector", () => {
    render(<App/>);
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });

  it("renders pathway headers", () => {
    render(<App/>);
    expect(screen.getByText("P1")).toBeDefined();
  });

  it("renders the scale selector", () => {
    render(<App/>);
    expect(screen.getByText("Fixed size: blue → white → red")).toBeDefined();
  });

  it("renders a 'Show Scaler' checkbox that is unchecked by default", () => {
    render(<App/>);
    const checkbox = screen.getByLabelText("Show Scaler");
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it("shows raw activations, scaler mean, and scaler scale when Show Scaler is checked", () => {
    render(<App/>);
    // Row should not be visible by default
    expect(screen.queryByText("Raw Activations")).toBeNull();
    expect(screen.queryByText("Scaler Mean")).toBeNull();
    expect(screen.queryByText("Scaler Scale")).toBeNull();

    // Check the toggle
    fireEvent.click(screen.getByLabelText("Show Scaler"));

    // All three labels should now be visible
    expect(screen.getByText("Raw Activations")).toBeDefined();
    expect(screen.getByText("Scaler Mean")).toBeDefined();
    expect(screen.getByText("Scaler Scale")).toBeDefined();
  });
});
