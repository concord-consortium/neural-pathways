import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsPanel } from "./results-panel";
import { S3Item } from "../../shared/types/s3-data";

const makeReview = (id: string, text: string, scores: number[]): S3Item => ({
  id,
  sources: { test: [0] },
  text,
  target: 1,
  target_label: "positive",
  pathway_scores: { fit_a: scores },
  reconstruction_r2: { fit_a: 0.9 },
  pathway_variance_fractions: { fit_a: scores.map(() => 1 / scores.length) },
});

const reviews = [
  makeReview("r0", "Great pizza and wonderful service that keeps me coming back", [0.8, 0.3]),
  makeReview("r1", "Terrible experience, never coming back to this place ever again", [0.1, 0.9]),
];

const defaultProps = {
  reviews,
  fitName: "fit_a",
  selectedReviewId: null as string | null,
  onSelectReview: jest.fn(),
  maxAbsScore: 1,
  resultCount: 2,
  totalCount: 100,
};

describe("ResultsPanel", () => {
  it("renders a list of review cards", () => {
    render(<ResultsPanel {...defaultProps} />);
    expect(screen.getByText(/Great pizza/)).toBeDefined();
    expect(screen.getByText(/Terrible experience/)).toBeDefined();
  });

  it("displays the result count in the header", () => {
    render(<ResultsPanel {...defaultProps} />);
    expect(screen.getByText("2 of 100")).toBeDefined();
  });

  it("renders pathway score bars with correct widths and colors", () => {
    render(<ResultsPanel {...defaultProps} />);
    // eslint-disable-next-line testing-library/no-node-access -- checking inline styles on bar elements
    const bars = document.querySelectorAll(".results-panel-bar");
    // 2 reviews x 2 pathways = 4 bars
    expect(bars.length).toBe(4);
    // First review, first pathway: 0.8 / 1 = 80%
    expect((bars[0] as HTMLElement).style.height).toBe("80%");
    expect((bars[0] as HTMLElement).style.backgroundColor).toBe("rgb(231, 76, 60)");
  });

  it("highlights the selected review", () => {
    render(<ResultsPanel {...defaultProps} selectedReviewId="r0" />);
    // eslint-disable-next-line testing-library/no-node-access -- checking CSS class on parent element
    const selectedCard = screen.getByText(/Great pizza/).closest(".results-panel-card");
    expect(selectedCard?.classList.contains("selected")).toBe(true);
  });

  it("calls onSelectReview when a card is clicked", () => {
    const onSelect = jest.fn();
    render(<ResultsPanel {...defaultProps} onSelectReview={onSelect} />);
    fireEvent.click(screen.getByText(/Terrible experience/));
    expect(onSelect).toHaveBeenCalledWith(reviews[1]);
  });

  it("can be collapsed and expanded", () => {
    render(<ResultsPanel {...defaultProps} />);
    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseButton);
    expect(screen.queryByText(/Great pizza/)).toBeNull();

    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
    expect(screen.getByText(/Great pizza/)).toBeDefined();
  });
});
