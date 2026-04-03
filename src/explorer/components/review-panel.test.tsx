import React from "react";
import { render, screen } from "@testing-library/react";
import { ReviewPanel } from "./review-panel";
import { ExplorerReview } from "../types/explorer-data";

const mockReview: ExplorerReview = {
  index: 719,
  source: "test",
  text: "Delivery was FAST. White pizza was delicious.",
  target: 1,
  target_label: "positive",
  pathway_scores: [1.01, -0.52, -0.11, -0.50, -1.15, -0.21],
  reconstruction_r2: 0.9662,
  pathway_variance_fractions: [0.98, 0.01, 0.0, 0.0, 0.01, 0.0],
  name: "Joe's Pizza",
  city: "Philadelphia",
  state: "PA",
  stars: 4.0,
  review_stars: 5,
  categories: "Pizza, Italian",
  rating: "positive",
  words: [{ word: "Delivery", scores: [0.1] }, { word: "was", scores: [0.0] }],
  base_values: [0],
  unmasked_values: [0],
};

describe("ReviewPanel", () => {
  it("renders the review text", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText("Delivery was FAST. White pizza was delicious.")).toBeDefined();
  });

  it("renders the classification badge", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText("positive")).toBeDefined();
  });

  it("renders the source badge", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText("test")).toBeDefined();
  });

  it("renders business info", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText(/Joe's Pizza/)).toBeDefined();
    expect(screen.getByText(/Philadelphia/)).toBeDefined();
  });

  it("renders categories", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText("Pizza, Italian")).toBeDefined();
  });

  it("renders R² value", () => {
    render(<ReviewPanel review={mockReview} />);
    expect(screen.getByText("0.9662")).toBeDefined();
  });

  it("renders star rating", () => {
    render(<ReviewPanel review={mockReview} />);
    // review_stars = 5, so 5 filled stars
    const starContainer = screen.getByTestId("review-stars");
    expect(starContainer.textContent).toContain("★★★★★");
  });
});
