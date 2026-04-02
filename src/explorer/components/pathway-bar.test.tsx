import React from "react";
import { render, screen } from "@testing-library/react";
import { PathwayBar } from "./pathway-bar";

describe("PathwayBar", () => {
  it("renders the pathway label", () => {
    render(
      <PathwayBar
        index={0}
        score={0.5}
        scaleExtent={[-3, 3]}
      />
    );
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });

  it("renders the numeric score", () => {
    render(
      <PathwayBar
        index={2}
        score={-1.234}
        scaleExtent={[-3, 3]}
      />
    );
    expect(screen.getByText("-1.234")).toBeDefined();
  });

  it("shows variance fraction when provided", () => {
    render(
      <PathwayBar
        index={0}
        score={1.0}
        scaleExtent={[-3, 3]}
        varianceFraction={0.9827}
      />
    );
    expect(screen.getByText("98.3%")).toBeDefined();
  });

  it("does not show variance fraction when not provided", () => {
    render(
      <PathwayBar
        index={0}
        score={1.0}
        scaleExtent={[-3, 3]}
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
      />
    );
    const fill = screen.getByTestId("pathway-bar-fill-0");
    expect(fill.classList.contains("negative")).toBe(true);
  });
});
