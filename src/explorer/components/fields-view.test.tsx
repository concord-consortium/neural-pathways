import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldsView } from "./fields-view";
import { Series } from "../types/explorer-data";

const noun = { singular: "review", plural: "reviews" };

/** Twelve items, so a pathway series can carry enough distinct values to bin numerically. */
const makeSeries = (values: {
  flag: (number | null)[]; rating: number[]; p0: number[];
}): Series[] => [
  {
    key: "flag", label: "Flag", kind: "attribute", attributeType: "binary",
    valueLabels: { 0: "no", 1: "yes" }, description: "A flag.", values: values.flag,
  },
  {
    key: "rating", label: "Rating", kind: "attribute", attributeType: "integer",
    description: "A rating.", values: values.rating,
  },
  {
    key: "pathway_0", label: "P0", kind: "pathway", description: "", values: values.p0,
  },
];

const baseline = makeSeries({
  flag: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  rating: [1, 2, 3, 4, 5, 5, 1, 2, 3, 4, 5, 5],
  p0: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2],
});

const subset = makeSeries({
  flag: [1, 1, 1],
  rating: [1, 1, 2],
  p0: [0.1, 0.2, 0.3],
});

const renderView = (props: Partial<React.ComponentProps<typeof FieldsView>> = {}) =>
  render(
    <FieldsView
      series={subset} baselineSeries={baseline}
      resultCount={3} totalCount={12} itemNoun={noun} {...props}
    />,
  );

describe("FieldsView", () => {
  it("states the scope with both counts", () => {
    renderView();
    expect(screen.getByTestId("fields-scope").textContent).toContain("3 of 12 reviews");
  });

  it("lists attributes before pathways, with a separator between", () => {
    renderView();
    const rows = screen.getAllByText(/^(Flag|Rating|P0)$/).map(node => node.textContent);
    expect(rows).toEqual(["Flag", "Rating", "P0"]);
    expect(screen.getByTestId("fields-kind-separator")).toBeDefined();
  });

  it("computes each row's numbers against the baseline", () => {
    renderView();
    // Every item in the selection has flag = 1; two of twelve in six do overall.
    const row = screen.getByTestId("field-row-flag");
    expect(row.textContent).toContain("yes 100%");
    expect(row.textContent).toContain("yes 50%");
  });

  it("prompts before anything is selected", () => {
    renderView();
    expect(screen.getByTestId("fields-prompt")).toBeDefined();
    expect(screen.queryByTestId("field-detail")).toBeNull();
  });

  it("opens the detail for a clicked field", () => {
    renderView();
    fireEvent.click(screen.getByTestId("field-row-rating"));
    expect(screen.getByTestId("field-detail-title").textContent).toContain("Rating");
    expect(screen.queryByTestId("fields-prompt")).toBeNull();
  });

  it("bins the selection against the baseline, not against itself", () => {
    renderView();
    fireEvent.click(screen.getByTestId("field-row-rating"));
    // The baseline's ratings are 1..5, so the axis spans all five values even
    // though the selection only holds 1 and 2. Binning from the selection would
    // have produced a two-bar axis that no longer lines up with the baseline.
    expect(screen.getAllByTestId("axis-tick").map(t => t.textContent))
      .toEqual(["1", "2", "3", "4", "5"]);
  });

  it("keeps the selection when the filter changes", () => {
    const { rerender } = renderView();
    fireEvent.click(screen.getByTestId("field-row-rating"));

    const narrower = makeSeries({ flag: [1], rating: [5], p0: [1.2] });
    rerender(
      <FieldsView
        series={narrower} baselineSeries={baseline}
        resultCount={1} totalCount={12} itemNoun={noun}
      />,
    );

    expect(screen.getByTestId("field-detail-title").textContent).toContain("Rating");
    expect(screen.getByTestId("fields-scope").textContent).toContain("1 of 12");
  });

  it("drops the selection when its field disappears", () => {
    const { rerender } = renderView();
    fireEvent.click(screen.getByTestId("field-row-rating"));

    const withoutRating = baseline.filter(s => s.key !== "rating");
    rerender(
      <FieldsView
        series={subset.filter(s => s.key !== "rating")} baselineSeries={withoutRating}
        resultCount={3} totalCount={12} itemNoun={noun}
      />,
    );

    expect(screen.queryByTestId("field-detail")).toBeNull();
    expect(screen.getByTestId("fields-prompt")).toBeDefined();
  });

  it("says so when nothing matched instead of listing empty fields", () => {
    const empty = makeSeries({ flag: [], rating: [], p0: [] });
    renderView({ series: empty, resultCount: 0 });
    expect(screen.getByTestId("fields-empty-selection")).toBeDefined();
    expect(screen.queryByTestId("field-row-flag")).toBeNull();
  });

  it("shows a field with no values anywhere as an unselectable row", () => {
    const blankBaseline = baseline.map(s =>
      s.key === "rating" ? { ...s, values: s.values.map(() => null) } : s);
    renderView({ baselineSeries: blankBaseline });
    expect(screen.getByTestId("field-row-rating").tagName).toBe("DIV");
  });

  it("says so when the dataset declares no fields at all", () => {
    renderView({ series: [], baselineSeries: [] });
    expect(screen.getByTestId("fields-empty")).toBeDefined();
  });
});
