import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsPanel } from "./results-panel";
import { S3Review } from "../../shared/types/s3-data";

const makeReview = (id: string, text: string, scores: number[]): S3Review => ({
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

describe("ResultsPanel", () => {
  it("renders a list of review cards", () => {
    render(
      <ResultsPanel reviews={reviews} fitName="fit_a" selectedReviewId={null} onSelectReview={jest.fn()} />
    );
    expect(screen.getByText(/Great pizza/)).toBeDefined();
    expect(screen.getByText(/Terrible experience/)).toBeDefined();
  });

  it("shows pathway scores as badges", () => {
    render(
      <ResultsPanel reviews={reviews} fitName="fit_a" selectedReviewId={null} onSelectReview={jest.fn()} />
    );
    expect(screen.getByText("P0: 0.80")).toBeDefined();
    expect(screen.getByText("P1: 0.30")).toBeDefined();
  });

  it("highlights the selected review", () => {
    render(
      <ResultsPanel reviews={reviews} fitName="fit_a" selectedReviewId="r0" onSelectReview={jest.fn()} />
    );
    const selectedCard = screen.getByText(/Great pizza/).closest(".results-panel-card");
    expect(selectedCard?.classList.contains("selected")).toBe(true);
  });

  it("calls onSelectReview when a card is clicked", () => {
    const onSelect = jest.fn();
    render(
      <ResultsPanel reviews={reviews} fitName="fit_a" selectedReviewId={null} onSelectReview={onSelect} />
    );
    fireEvent.click(screen.getByText(/Terrible experience/));
    expect(onSelect).toHaveBeenCalledWith(reviews[1]);
  });

  it("can be collapsed and expanded", () => {
    render(
      <ResultsPanel reviews={reviews} fitName="fit_a" selectedReviewId={null} onSelectReview={jest.fn()} />
    );
    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseButton);
    expect(screen.queryByText(/Great pizza/)).toBeNull();

    const expandButton = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandButton);
    expect(screen.getByText(/Great pizza/)).toBeDefined();
  });
});
