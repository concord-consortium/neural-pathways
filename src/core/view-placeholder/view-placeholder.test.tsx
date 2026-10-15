import React from "react";
import { render, screen } from "@testing-library/react";
import { ViewPlaceholder } from "./view-placeholder";

describe("ViewPlaceholder", () => {
  it("shows the view's title, its About button and that it's coming", () => {
    render(<ViewPlaceholder className="correlations" title="Correlations" about="What it's for." />);
    expect(screen.getByRole("heading", { level: 1, name: "Correlations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About Correlations" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon.")).toBeInTheDocument();
  });
});
