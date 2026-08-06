import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldListRow } from "./field-list-row";
import { Series } from "../types/explorer-data";
import { FieldStats } from "../utils/statistics";

const binary: Series = {
  key: "target", label: "Actual sentiment", kind: "attribute", attributeType: "binary",
  valueLabels: { 0: "negative", 1: "positive" },
  description: "The true sentiment label.", values: [],
};

const numeric: Series = {
  key: "review_stars", label: "Review rating", kind: "attribute", attributeType: "integer",
  description: "One to five stars.", values: [],
};

const stats = (over: Partial<FieldStats>): FieldStats =>
  ({ n: 10, mean: 0.5, min: 0, max: 1, counts: [5, 5], ...over });

const renderRow = (props: Partial<React.ComponentProps<typeof FieldListRow>> = {}) =>
  render(
    <FieldListRow
      series={binary}
      subset={stats({ mean: 0.31 })}
      baseline={stats({ mean: 0.09 })}
      selected={false}
      onSelect={() => undefined}
      {...props}
    />,
  );

describe("FieldListRow", () => {
  it("shows the field's label", () => {
    renderRow();
    expect(screen.getByText("Actual sentiment")).toBeDefined();
  });

  it("carries the description as a hover title, as the matrix does", () => {
    renderRow();
    expect(screen.getByTestId("field-row-target").getAttribute("title"))
      .toBe("The true sentiment label.");
  });

  it("states a binary field as a percentage named by its value label", () => {
    renderRow();
    expect(screen.getByTestId("field-row-subset").textContent).toBe("positive 31%");
    expect(screen.getByTestId("field-row-baseline").textContent).toBe("positive 9%");
  });

  it("falls back to yes for a binary field with no value labels", () => {
    renderRow({ series: { ...binary, valueLabels: undefined } });
    expect(screen.getByTestId("field-row-subset").textContent).toBe("yes 31%");
  });

  it("states a numeric field as a mean", () => {
    renderRow({
      series: numeric,
      subset: stats({ mean: 2.9 }),
      baseline: stats({ mean: 3.7 }),
    });
    expect(screen.getByTestId("field-row-subset").textContent).toBe("mean 2.9");
    expect(screen.getByTestId("field-row-baseline").textContent).toBe("mean 3.7");
  });

  it("draws one sparkline bar per bin of the subset", () => {
    renderRow({ subset: stats({ counts: [1, 2, 3, 4] }) });
    expect(screen.getAllByTestId("field-row-spark-bar")).toHaveLength(4);
  });

  it("shows a dash and no sparkline when the selection has no values", () => {
    renderRow({ subset: null });
    expect(screen.getByTestId("field-row-subset").textContent).toBe("—");
    expect(screen.queryAllByTestId("field-row-spark-bar")).toHaveLength(0);
    // Still a button: the field has values in the dataset, so there is a
    // baseline distribution to open even though the selection contributes none.
    expect(screen.getByTestId("field-row-target").tagName).toBe("BUTTON");
  });

  it("calls onSelect when clicked", () => {
    const onSelect = jest.fn();
    renderRow({ onSelect });
    fireEvent.click(screen.getByTestId("field-row-target"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("renders an unselectable row when the field has no values anywhere", () => {
    const onSelect = jest.fn();
    renderRow({ subset: null, baseline: null, onSelect });
    const row = screen.getByTestId("field-row-target");
    // Not a button: there is no distribution to open, so offering the
    // affordance would promise something the detail pane cannot deliver.
    expect(row.tagName).toBe("DIV");
    fireEvent.click(row);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the selected row", () => {
    renderRow({ selected: true });
    expect(screen.getByTestId("field-row-target").className).toContain("selected");
  });
});
