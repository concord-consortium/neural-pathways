import React from "react";
import { render, screen } from "@testing-library/react";
import { PathwayPanel } from "./pathway-panel";

const mockScores = [1.01, -0.52, -0.11, -0.50, -1.15, -0.21];
const mockVarianceFractions = [0.9827, 0.0069, 0.0001, 0.0018, 0.0084, 0.0002];
const sharedExtent: [number, number] = [-7.38, 8.75];
const perPathwayExtents: [number, number][] = [
  [-1.03, 1.03], [-1.71, 8.75], [-4.64, 6.16],
  [-7.38, 5.09], [-4.62, 5.46], [-4.91, 6.68],
];

describe("PathwayPanel", () => {
  it("renders all 6 pathway bars", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
      />
    );
    for (let i = 0; i < 6; i++) {
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
      />
    );
    expect(screen.queryByText("98.3%")).toBeNull();
  });
});
