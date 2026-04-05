import React from "react";
import { render, screen } from "@testing-library/react";
import { WordEffectsPanel } from "./word-effects-panel";
import { ReviewShapData } from "../../shared/types/s3-data";

const mockShapData: ReviewShapData = {
  words: [
    { word: "great", scores: [0.5, -0.3, 0.1] },
    { word: "food", scores: [-0.2, 0.4, -0.5] },
  ],
  base_values: [0, 0, 0],
  unmasked_values: [1, 1, 1],
};

const defaultProps = {
  shapData: mockShapData,
  shapLoading: false,
  hasShapForCurrentFit: true,
  shapAvailableFits: ["default"],
  currentFitName: "default",
  wordColorMode: "score" as const,
  wordScaleScope: "per-pathway" as const,
  showPathwayValues: false,
};

describe("WordEffectsPanel", () => {
  it("renders one block per selected pathway", () => {
    const selected = new Set([0, 2]);
    render(<WordEffectsPanel selectedPathways={selected} {...defaultProps} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
    expect(screen.getByText("Pathway 2")).toBeDefined();
    expect(screen.queryByText("Pathway 1")).toBeNull();
  });

  it("renders nothing when no pathways are selected", () => {
    const selected = new Set<number>();
    render(
      <WordEffectsPanel selectedPathways={selected} {...defaultProps} />
    );
    expect(screen.queryByText(/^Pathway \d+$/)).toBeNull();
  });

  it("renders pathways in ascending index order", () => {
    const selected = new Set([2, 0]);
    render(<WordEffectsPanel selectedPathways={selected} {...defaultProps} />);
    const headers = screen.getAllByText(/^Pathway \d+$/);
    expect(headers[0].textContent).toBe("Pathway 0");
    expect(headers[1].textContent).toBe("Pathway 2");
  });

  it("shows loading state when shapLoading is true", () => {
    render(
      <WordEffectsPanel
        {...defaultProps}
        shapData={null}
        shapLoading={true}
        selectedPathways={new Set([0])}
      />
    );
    expect(screen.getByText("Loading word effects...")).toBeDefined();
  });

  it("shows unavailable message when hasShapForCurrentFit is false", () => {
    render(
      <WordEffectsPanel
        {...defaultProps}
        hasShapForCurrentFit={false}
        shapAvailableFits={[]}
        selectedPathways={new Set([0])}
      />
    );
    expect(screen.getByText("No word effects available for this review.")).toBeDefined();
  });

  it("shows switch-fit links when SHAP available for other fits", () => {
    const onSwitchFit = jest.fn();
    render(
      <WordEffectsPanel
        {...defaultProps}
        hasShapForCurrentFit={false}
        shapAvailableFits={["other-fit"]}
        currentFitName="default"
        selectedPathways={new Set([0])}
        onSwitchFit={onSwitchFit}
      />
    );
    expect(screen.getByText("other-fit")).toBeDefined();
  });
});
