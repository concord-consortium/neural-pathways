import React from "react";
import { render, screen } from "@testing-library/react";
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
});
