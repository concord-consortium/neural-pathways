import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CorrelationsView } from "./correlations-view";
import { Series } from "../types/explorer-data";

// Twelve rows, so a pathway series can carry more distinct values than the
// cardinality threshold the drill-down routes on.
const series: Series[] = [
  {
    key: "flag", label: "Flag", kind: "attribute", attributeType: "binary",
    // Deliberately not a yes/no attribute: 0 and 1 mean two named states here,
    // which is what the removed hardcoded label map used to get wrong.
    valueLabels: { 0: "negative", 1: "positive" },
    description: "A flag.", values: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  },
  {
    key: "rating", label: "Rating", kind: "attribute", attributeType: "integer",
    description: "A rating.", values: [1, 2, 3, 4, 5, 5, 1, 2, 3, 4, 5, 5],
  },
  {
    key: "pathway_0", label: "P0", kind: "pathway",
    description: "", values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2],
  },
];

const yelpNoun = { singular: "review", plural: "reviews" };

const renderView = () =>
  render(<CorrelationsView series={series} resultCount={12} totalCount={100} itemNoun={yelpNoun} />);

/** Renders a two-series view whose row is exactly the given values. */
const renderWithRow = (values: number[]) => {
  const custom: Series[] = [
    {
      key: "row", label: "Row", kind: "attribute", attributeType: "integer",
      description: "", values,
    },
    {
      key: "pathway_0", label: "P0", kind: "pathway",
      description: "", values: values.map((_, i) => i * 0.37),
    },
  ];
  return render(
    <CorrelationsView
      series={custom} resultCount={values.length} totalCount={values.length} itemNoun={yelpNoun}
    />,
  );
};

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
    expect(screen.getByTestId("correlations-scope").textContent).toContain("12 of 100 reviews");
  });

  it("names the items using the dataset's noun", () => {
    render(<CorrelationsView series={[]} resultCount={6} totalCount={800}
      itemNoun={{ singular: "conversation", plural: "conversations" }} />);
    expect(screen.getByTestId("correlations-scope").textContent).toContain("of 800 conversations");
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

  it("labels the drill-down groups from the row series rather than a fixed map", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(screen.getByTestId("group-row-0").textContent).toContain("negative");
    expect(screen.getByTestId("group-row-1").textContent).toContain("positive");
    expect(screen.getByTestId("group-row-1").textContent).not.toContain("yes");
  });

  it("shows the group comparison when a low-cardinality non-binary row is selected", () => {
    renderView();
    // "Rating" is an integer attribute with five distinct values. A scatter would
    // stack every point on five x positions, so cardinality — not the declared
    // type — decides the renderer.
    fireEvent.click(screen.getByTestId("cell-rating-pathway_0"));
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
    expect(screen.queryByTestId("scatter-plot")).toBeNull();
  });

  it("renders one group per distinct value for a five-valued row", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-rating-pathway_0"));
    for (const value of [1, 2, 3, 4, 5]) {
      expect(screen.getByTestId(`group-row-${value}`)).toBeDefined();
    }
  });

  it("shows a scatter plot when a pathway row is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-pathway_0-rating"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
    expect(screen.queryByTestId("distribution-comparison")).toBeNull();
  });

  it("keeps the group comparison at the cardinality threshold", () => {
    renderWithRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    fireEvent.click(screen.getByTestId("cell-row-pathway_0"));
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
    expect(screen.queryByTestId("scatter-plot")).toBeNull();
  });

  it("switches to the scatter plot one value above the threshold", () => {
    renderWithRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    fireEvent.click(screen.getByTestId("cell-row-pathway_0"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
    expect(screen.queryByTestId("distribution-comparison")).toBeNull();
  });

  it("ignores missing values when counting a row's distinct values", () => {
    // Ten distinct real values plus nulls. Counting null as a value would push
    // this to eleven and wrongly send it to the scatter.
    const withMissing: Series[] = [
      {
        key: "row", label: "Row", kind: "attribute", attributeType: "integer",
        description: "", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, null, null],
      },
      {
        key: "pathway_0", label: "P0", kind: "pathway",
        description: "", values: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2],
      },
    ];
    render(<CorrelationsView series={withMissing} resultCount={12} totalCount={12} itemNoun={yelpNoun} />);
    fireEvent.click(screen.getByTestId("cell-row-pathway_0"));
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
  });

  it("reports r and n for the selected pair", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("n = 12");
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("Flag");
    expect(screen.getByTestId("drilldown-summary").textContent).toContain("P0");
  });

  it("replaces the drill-down when a different cell is selected", () => {
    renderView();
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
    fireEvent.click(screen.getByTestId("cell-pathway_0-flag"));
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
    expect(screen.queryByTestId("distribution-comparison")).toBeNull();
  });

  it("tells the user when there is nothing to correlate", () => {
    render(<CorrelationsView series={[]} resultCount={0} totalCount={100} itemNoun={yelpNoun} />);
    expect(screen.getByTestId("correlations-empty")).toBeDefined();
  });
});

describe("CorrelationsView regression panel", () => {
  it("renders the regression panel", () => {
    render(<CorrelationsView series={series} resultCount={6} totalCount={100} itemNoun={yelpNoun} />);
    expect(screen.getByTestId("regression-panel")).toBeDefined();
  });

  it("renders the panel even before a matrix cell is selected", () => {
    render(<CorrelationsView series={series} resultCount={6} totalCount={100} itemNoun={yelpNoun} />);
    expect(screen.getByTestId("drilldown-prompt")).toBeDefined();
    expect(screen.getByTestId("regression-panel")).toBeDefined();
  });

  it("does not render the panel when there are no series", () => {
    render(<CorrelationsView series={[]} resultCount={0} totalCount={100} itemNoun={yelpNoun} />);
    expect(screen.queryByTestId("regression-panel")).toBeNull();
  });
});
