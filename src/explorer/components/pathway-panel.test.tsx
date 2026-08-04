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
const yelpNoun = { singular: "review", plural: "reviews" };

describe("PathwayPanel", () => {
  it("renders all 7 pathway bars", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showExtents={false}
        itemNoun={yelpNoun}
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
        showExtents={false}
        itemNoun={yelpNoun}
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
        showExtents={false}
        itemNoun={yelpNoun}
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
        showExtents={false}
        itemNoun={yelpNoun}
        onPathwayClick={onPathwayClick}
        selectedPathways={new Set()}
      />
    );
    fireEvent.click(screen.getByTestId("pathway-bar-row-2"));
    expect(onPathwayClick).toHaveBeenCalledWith(2);
  });

  it("renders the legend card", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showExtents={false}
        itemNoun={yelpNoun}
      />
    );
    expect(screen.getByTestId("pathway-panel-legend")).toBeDefined();
    expect(screen.getByText("This Review")).toBeDefined();
    expect(screen.getByText("Fit Properties")).toBeDefined();
  });

  it("names the legend using the dataset's noun", () => {
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showExtents={false}
        itemNoun={{ singular: "conversation", plural: "conversations" }}
      />
    );
    expect(screen.getByText("This Conversation")).toBeDefined();
  });

  it("passes explained variance and importance to pathway bars", () => {
    const ev = [0.82, 0.05, 0.04, 0.03, 0.02, 0.01, 0.005];
    const imp = [-5.0, -0.1, 0.3, 0.7, 0.3, -0.07, -0.004];
    render(
      <PathwayPanel
        scores={mockScores}
        scaleMode="shared"
        scaleExtents={{ shared: sharedExtent, perPathway: perPathwayExtents }}
        showVarianceFractions={false}
        showExtents={false}
        itemNoun={yelpNoun}
        explainedVariancePerPathway={ev}
        pathwayImportance={imp}
      />
    );
    const evFill = screen.getByTestId("ev-fill-0");
    expect(evFill.style.width).toBe("82%");
    expect(screen.getByTestId("imp-fill-0")).toBeDefined();
  });
});
