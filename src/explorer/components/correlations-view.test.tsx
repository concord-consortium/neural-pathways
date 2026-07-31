import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CorrelationsView } from "./correlations-view";
import { Series } from "../types/explorer-data";

const series: Series[] = [
  {
    key: "flag", label: "Flag", kind: "attribute", attributeType: "binary",
    description: "A flag.", values: [0, 0, 0, 1, 1, 1],
  },
  {
    key: "rating", label: "Rating", kind: "attribute", attributeType: "integer",
    description: "A rating.", values: [1, 2, 3, 4, 5, 5],
  },
  {
    key: "pathway_0", label: "P0", kind: "pathway",
    description: "", values: [1, 2, 3, 7, 8, 9],
  },
];

const renderView = () =>
  render(<CorrelationsView series={series} resultCount={6} totalCount={100} />);

describe("CorrelationsView", () => {
  it("renders the container", () => {
    renderView();
    expect(screen.getByTestId("correlations-view")).toBeDefined();
  });

  it("states the scope with both counts", () => {
    renderView();
    // Asserted via textContent, not getByText: the count sits inside a <strong>,
    // and getByText only joins an element's direct text-node children, so a
    // regex spanning the <strong> would never match.
    expect(screen.getByTestId("correlations-scope").textContent).toContain("6 of 100 reviews");
  });

  it("renders the matrix", () => {
    renderView();
    expect(screen.getByTestId("correlation-matrix")).toBeDefined();
  });

  it("prompts to pick a cell before one is selected", () => {
    renderView();
    expect(screen.getByTestId("drilldown-prompt")).toBeDefined();
  });

  it("shows the group comparison when a binary attribute row is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
    expect(screen.queryByTestId("scatter-plot")).toBeNull();
  });

  it("shows a scatter plot when a non-binary row is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-rating-pathway_0"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
    expect(screen.queryByTestId("distribution-comparison")).toBeNull();
  });

  it("shows a scatter plot when a pathway row is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-pathway_0-rating"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
  });

  it("reports r and n for the selected pair", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("n = 6");
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("Flag");
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("P0");
  });

  it("replaces the drill-down when a different cell is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    fireEvent.click(screen.getByTestId("cell-rating-pathway_0"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
    expect(screen.queryByTestId("distribution-comparison")).toBeNull();
  });

  it("tells the user when there is nothing to correlate", () => {
    render(<CorrelationsView series={[]} resultCount={0} totalCount={100} />);
    expect(screen.getByTestId("correlations-empty")).toBeDefined();
  });
});
