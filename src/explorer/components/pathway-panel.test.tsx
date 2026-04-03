import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PathwayPanel } from "./pathway-panel";

const mockScores = [1.01, -0.52, -0.11, -0.50, -1.15, -0.21, 0.33];
const mockVarianceFractions = [0.9827, 0.0069, 0.0001, 0.0018, 0.0084, 0.0002, 0.0001];
const sharedExtent: [number, number] = [-7.38, 8.75];
const perPathwayExtents: [number, number][] = [
  [-1.03, 1.03], [-1.71, 8.75], [-4.64, 6.16],
  [-7.38, 5.09], [-4.62, 5.46], [-4.91, 6.68], [-3.20, 4.50],
];

describe("PathwayPanel", () => {
  it("renders all 7 pathway bars", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showScores={false}
        showExtents={false}
      />
    );
    for (let i = 0; i < 7; i++) {
      expect(screen.getByText(`Pathway ${i}`)).toBeDefined();
    }
  });

  it("passes variance fractions when enabled", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        varianceFractions={mockVarianceFractions}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={true}
        showScores={false}
        showExtents={false}
      />
    );
    expect(screen.getByText("98.3%")).toBeDefined();
  });

  it("does not show variance fractions when disabled", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        varianceFractions={mockVarianceFractions}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showScores={false}
        showExtents={false}
      />
    );
    expect(screen.queryByText("98.3%")).toBeNull();
  });

  it("calls onPathwayClick when a pathway bar is clicked", () => {
    const onPathwayClick = jest.fn();
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showScores={false}
        showExtents={false}
        onPathwayClick={onPathwayClick}
        selectedPathways={new Set()}
      />
    );
    fireEvent.click(screen.getByTestId("pathway-bar-row-2"));
    expect(onPathwayClick).toHaveBeenCalledWith(2);
  });
});
