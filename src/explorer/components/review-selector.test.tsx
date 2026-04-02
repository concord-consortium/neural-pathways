// src/explorer/components/review-selector.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewSelector } from "./review-selector";
import { ExplorerReview } from "../types/explorer-data";

const makeReview = (index: number, text: string): ExplorerReview => ({
  index,
  source: "test",
  text,
  target: 1,
  target_label: "positive",
  pathway_scores: [0, 0, 0, 0, 0, 0],
  reconstruction_r2: 0.9,
  pathway_variance_fractions: [1, 0, 0, 0, 0, 0],
  name: "Place",
  city: "City",
  state: "ST",
  stars: 4,
  review_stars: 5,
  categories: "Food",
  rating: "positive",
});

const reviews = [
  makeReview(0, "Great pizza and wonderful service"),
  makeReview(1, "Terrible experience, never again"),
  makeReview(719, "Delivery was FAST"),
  makeReview(7190, "The best tacos in town"),
];

describe("ReviewSelector", () => {
  it("renders the search input", () => {
    render(<ReviewSelector reviews={reviews} onSelect={() => {}} />);
    expect(screen.getByPlaceholderText(/Search by review/)).toBeDefined();
  });

  it("filters by index number", () => {
    render(<ReviewSelector reviews={reviews} onSelect={() => {}} />);
    const input = screen.getByPlaceholderText(/Search by review/);
    fireEvent.change(input, { target: { value: "719" } });
    expect(screen.getAllByText(/#719/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/#7190/).length).toBeGreaterThanOrEqual(1);
  });

  it("filters by text content", () => {
    render(<ReviewSelector reviews={reviews} onSelect={() => {}} />);
    const input = screen.getByPlaceholderText(/Search by review/);
    fireEvent.change(input, { target: { value: "pizza" } });
    expect(screen.getByText(/#0/)).toBeDefined();
    // "Terrible experience" should not match
    expect(screen.queryByText(/#1\b/)).toBeNull();
  });

  it("calls onSelect when a dropdown item is clicked", () => {
    const onSelect = jest.fn();
    render(<ReviewSelector reviews={reviews} onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Search by review/);
    fireEvent.change(input, { target: { value: "719" } });
    // Click the index span that shows exactly "#719" (not "#7190")
    fireEvent.click(screen.getByText("#719"));
    expect(onSelect).toHaveBeenCalledWith(reviews[2]);
  });
});
