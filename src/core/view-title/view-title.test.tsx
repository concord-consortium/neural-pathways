import React from "react";
import { render, screen } from "@testing-library/react";
import { InteractiveModeContext, ViewTitle } from "./view-title";

describe("ViewTitle", () => {
  it("renders the title as the page's h1 outside an Interactive", () => {
    render(<ViewTitle className="correlations__title">Correlations</ViewTitle>);
    expect(screen.getByRole("heading", { level: 1, name: "Correlations" })).toHaveClass("correlations__title");
  });

  it("renders nothing in an Interactive", () => {
    const { container } = render(
      <InteractiveModeContext.Provider value={true}>
        <ViewTitle>Correlations</ViewTitle>
      </InteractiveModeContext.Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
