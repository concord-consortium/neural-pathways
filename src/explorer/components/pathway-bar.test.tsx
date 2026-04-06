import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PathwayBar } from "./pathway-bar";

describe("PathwayBar", () => {
  it("renders the pathway label", () => {
    render(
      <PathwayBar
        index={0}
        score={0.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
      />
    );
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });

  it("always renders the numeric score", () => {
    render(
      <PathwayBar
        index={2}
        score={-1.234}
        scaleExtent={[-3, 3]}
        showExtents={false}
      />
    );
    expect(screen.getByText("-1.234")).toBeDefined();
  });

  it("shows variance fraction as a fill bar when provided", () => {
    render(
      <PathwayBar
        index={0}
        score={1.0}
        scaleExtent={[-3, 3]}
        varianceFraction={0.9827}
        
        showExtents={false}
      />
    );
    expect(screen.getByText("98.3%")).toBeDefined();
    const fill = screen.getByTestId("variance-fill-0");
    expect(fill.style.width).toBe("98.27%");
  });

  it("does not show variance fraction when not provided", () => {
    render(
      <PathwayBar
        index={0}
        score={1.0}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
      />
    );
    expect(screen.queryByText(/^\d+\.\d+%$/)).toBeNull();
  });

  it("renders a positive bar to the right of center", () => {
    render(
      <PathwayBar
        index={0}
        score={1.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
      />
    );
    const fill = screen.getByTestId("pathway-bar-fill-0");
    expect(fill.classList.contains("positive")).toBe(true);
  });

  it("renders a negative bar to the left of center", () => {
    render(
      <PathwayBar
        index={0}
        score={-1.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
      />
    );
    const fill = screen.getByTestId("pathway-bar-fill-0");
    expect(fill.classList.contains("negative")).toBe(true);
  });

  it("calls onClick with the pathway index when clicked", () => {
    const onClick = jest.fn();
    render(
      <PathwayBar
        index={3}
        score={0.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByTestId("pathway-bar-row-3"));
    expect(onClick).toHaveBeenCalledWith(3);
  });

  it("applies selected styling when selected", () => {
    render(
      <PathwayBar
        index={0}
        score={0.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
        selected={true}
      />
    );
    const row = screen.getByTestId("pathway-bar-row-0");
    expect(row.classList.contains("pathway-bar-selected")).toBe(true);
  });

  it("renders explained variance fill bar when provided", () => {
    render(
      <PathwayBar
        index={0}
        score={0.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
        explainedVariance={0.855}
      />
    );
    const fill = screen.getByTestId("ev-fill-0");
    expect(fill.style.width).toBe("85.5%");
    expect(screen.getByText("85.5%")).toBeDefined();
  });

  it("renders importance bar when both importance and percent provided", () => {
    render(
      <PathwayBar
        index={0}
        score={0.5}
        scaleExtent={[-3, 3]}
        
        showExtents={false}
        pathwayImportance={-0.567}
        importancePercent={42.1}
        maxImportance={1.0}
      />
    );
    const fill = screen.getByTestId("imp-fill-0");
    expect(fill.classList.contains("imp-negative")).toBe(true);
    expect(screen.getByText("-0.57")).toBeDefined();
    expect(screen.getByTestId("imp-pct-fill-0")).toBeDefined();
    expect(screen.getByText("42.1%")).toBeDefined();
  });
});
