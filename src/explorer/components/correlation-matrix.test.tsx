import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CorrelationMatrix } from "./correlation-matrix";
import { Series } from "../types/explorer-data";

const series: Series[] = [
  {
    key: "flag", label: "Flag", kind: "attribute", attributeType: "binary",
    description: "A flag.", values: [0, 0, 1, 1],
  },
  {
    key: "flat", label: "Flat", kind: "attribute", attributeType: "binary",
    description: "No variance.", values: [1, 1, 1, 1],
  },
  {
    key: "pathway_0", label: "P0", kind: "pathway",
    description: "", values: [1, 2, 3, 4],
  },
];

const renderMatrix = (selected: { rowKey: string; colKey: string } | null = null,
  onSelect: (cell: { rowKey: string; colKey: string }) => void = () => undefined) =>
  render(<CorrelationMatrix series={series} selectedCell={selected} onSelectCell={onSelect} />);

describe("CorrelationMatrix", () => {
  it("renders a cell for every series pair", () => {
    renderMatrix();
    expect(screen.getByTestId("cell-flag-pathway_0")).toBeDefined();
    expect(screen.getByTestId("cell-pathway_0-flag")).toBeDefined();
    expect(screen.getByTestId("cell-flag-flag")).toBeDefined();
  });

  it("shows the correlation rounded to two decimals", () => {
    renderMatrix();
    // pearson([0,0,1,1],[1,2,3,4]) = 0.894...
    expect(screen.getByTestId("cell-flag-pathway_0").textContent).toBe("0.89");
  });

  it("renders an em dash when the correlation is undefined", () => {
    renderMatrix();
    // "flat" has zero variance, so r is null.
    expect(screen.getByTestId("cell-flat-pathway_0").textContent).toBe("—");
  });

  it("mutes the diagonal and does not report it as clickable", () => {
    renderMatrix();
    expect(screen.getByTestId("cell-flag-flag").className).toContain("diagonal");
  });

  it("calls onSelectCell when an off-diagonal cell is clicked", () => {
    const onSelect = jest.fn();
    renderMatrix(null, onSelect);
    fireEvent.click(screen.getByTestId("cell-flag-pathway_0"));
    expect(onSelect).toHaveBeenCalledWith({ rowKey: "flag", colKey: "pathway_0" });
  });

  it("does not call onSelectCell for a diagonal cell", () => {
    const onSelect = jest.fn();
    renderMatrix(null, onSelect);
    fireEvent.click(screen.getByTestId("cell-flag-flag"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not call onSelectCell for a cell with an undefined correlation", () => {
    const onSelect = jest.fn();
    renderMatrix(null, onSelect);
    fireEvent.click(screen.getByTestId("cell-flat-pathway_0"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the selected cell", () => {
    renderMatrix({ rowKey: "flag", colKey: "pathway_0" });
    expect(screen.getByTestId("cell-flag-pathway_0").className).toContain("selected");
    expect(screen.getByTestId("cell-flat-pathway_0").className).not.toContain("selected");
  });

  it("exposes n and full precision in the cell title", () => {
    renderMatrix();
    const title = screen.getByTestId("cell-flag-pathway_0").getAttribute("title");
    expect(title).toContain("n = 4");
  });

  it("marks the first pathway row and column as the boundary", () => {
    renderMatrix();
    expect(screen.getByTestId("cell-flag-pathway_0").className).toContain("boundary-left");
    expect(screen.getByTestId("cell-pathway_0-flag").className).toContain("boundary-top");
  });

  it("renders the series labels as headers", () => {
    renderMatrix();
    expect(screen.getAllByText("Flag").length).toBeGreaterThan(0);
    expect(screen.getAllByText("P0").length).toBeGreaterThan(0);
  });

  it("renders nothing when there are no series", () => {
    const { container } = render(
      <CorrelationMatrix series={[]} selectedCell={null} onSelectCell={() => undefined} />,
    );
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });
});
