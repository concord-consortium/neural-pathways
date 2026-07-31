import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegressionPanel } from "./regression-panel";
import { Series } from "../types/explorer-data";

const attribute = (key: string, label: string, values: (number | null)[]): Series => ({
  key, label, kind: "attribute", attributeType: "float", description: "", values,
});

const pathway = (key: string, label: string, values: (number | null)[]): Series => ({
  key, label, kind: "pathway", description: "", values,
});

// Twelve rows so df stays comfortable with interactions switched on.
const series: Series[] = [
  attribute("rating", "Rating", [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 2, 4]),
  attribute("flag", "Flag", [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1]),
  attribute("sparse", "Sparse", [1, null, 3, null, 5, 1, 2, 3, 4, 5, 2, 4]),
  pathway("pathway_0", "P0", [2, 3, 5, 6, 9, 1, 3, 4, 6, 8, 3, 7]),
];

const renderPanel = () => render(<RegressionPanel series={series} />);

describe("RegressionPanel", () => {
  it("renders the panel", () => {
    renderPanel();
    expect(screen.getByTestId("regression-panel")).toBeDefined();
  });

  it("defaults the target to the first pathway", () => {
    renderPanel();
    expect((screen.getByTestId("regression-target") as HTMLSelectElement).value)
      .toBe("pathway_0");
  });

  it("offers a checkbox for each attribute", () => {
    renderPanel();
    expect(screen.getByTestId("predictor-toggle-rating")).toBeDefined();
    expect(screen.getByTestId("predictor-toggle-flag")).toBeDefined();
    expect(screen.getByTestId("predictor-toggle-sparse")).toBeDefined();
  });

  it("starts with every predictor included", () => {
    renderPanel();
    expect((screen.getByTestId("predictor-toggle-rating") as HTMLInputElement).checked)
      .toBe(true);
  });

  it("names the method as least squares for a continuous target", () => {
    renderPanel();
    expect(screen.getByTestId("regression-method").textContent).toMatch(/least squares/i);
  });

  it("reports R squared for a continuous target", () => {
    renderPanel();
    expect(screen.getByTestId("regression-fit").textContent).toMatch(/R²/);
  });

  it("reports the rows used out of those available", () => {
    renderPanel();
    // "sparse" is missing twice, so listwise deletion leaves 10 of 12.
    expect(screen.getByTestId("regression-rows").textContent).toContain("10 of 12");
  });

  it("recovers rows when a costly predictor is unchecked", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("predictor-toggle-sparse"));
    expect(screen.getByTestId("regression-rows").textContent).toContain("12 of 12");
  });

  it("renders one row per retained term", () => {
    renderPanel();
    expect(screen.getByTestId("term-row-Rating")).toBeDefined();
    expect(screen.getByTestId("term-row-Flag")).toBeDefined();
  });

  it("excludes an unchecked predictor from the terms", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("predictor-toggle-rating"));
    expect(screen.queryByTestId("term-row-Rating")).toBeNull();
  });

  it("adds no interaction terms by default", () => {
    renderPanel();
    expect(screen.queryByTestId("term-row-Rating × Flag")).toBeNull();
  });

  it("adds interaction terms when the toggle is switched on", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("predictor-toggle-sparse"));
    fireEvent.click(screen.getByTestId("interactions-toggle"));
    expect(screen.getByTestId("term-row-Rating × Flag")).toBeDefined();
  });

  it("warns about multiple comparisons when interactions are on", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("predictor-toggle-sparse"));
    fireEvent.click(screen.getByTestId("interactions-toggle"));
    expect(screen.getByTestId("interactions-caution")).toBeDefined();
  });

  it("switches to logistic regression for a binary target", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("regression-target"), { target: { value: "flag" } });
    expect(screen.getByTestId("regression-method").textContent).toMatch(/logistic/i);
  });

  it("reports accuracy against a baseline for a binary target", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("regression-target"), { target: { value: "flag" } });
    expect(screen.getByTestId("regression-fit").textContent).toMatch(/accuracy/i);
    expect(screen.getByTestId("regression-fit").textContent).toMatch(/baseline/i);
  });

  it("does not offer the target as one of its own predictors", () => {
    renderPanel();
    fireEvent.change(screen.getByTestId("regression-target"), { target: { value: "flag" } });
    expect(screen.queryByTestId("predictor-toggle-flag")).toBeNull();
  });

  it("explains itself when no predictors are selected", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("predictor-toggle-rating"));
    fireEvent.click(screen.getByTestId("predictor-toggle-flag"));
    fireEvent.click(screen.getByTestId("predictor-toggle-sparse"));
    expect(screen.getByTestId("regression-unavailable")).toBeDefined();
  });

  it("renders nothing when there are no series", () => {
    const { container } = render(<RegressionPanel series={[]} />);
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });

  it("shows a dropped column by name with its reason, not silently", () => {
    renderPanel();
    // "sparse" duplicates "rating" exactly on the rows that survive listwise
    // deletion (both were built from the same values), so it is dropped as a
    // duplicate rather than fitted.
    expect(screen.getByTestId("regression-dropped").textContent).toContain("Sparse (duplicate)");
  });

  it("sorts term rows by descending |β|, regardless of predictor order", () => {
    renderPanel();
    // With "Rating" as the target, "Sparse" (a near-exact duplicate of "Rating")
    // dominates the fit and "Flag" carries almost nothing — the reverse of their
    // checkbox order, which lists "Flag" before "Sparse".
    fireEvent.change(screen.getByTestId("regression-target"), { target: { value: "rating" } });
    const rows = screen.getAllByTestId(/^term-row-/);
    expect(rows.map(row => row.getAttribute("data-testid"))).toEqual([
      "term-row-Sparse",
      "term-row-Flag",
    ]);
  });
});
