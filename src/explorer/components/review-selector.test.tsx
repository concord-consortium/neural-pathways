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
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    expect(screen.getByText(/Search by review/)).toBeDefined();
  });

  it("filters by index number", () => {
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "719" } });
    expect(screen.getByText(/719: /)).toBeDefined();
    expect(screen.getByText(/7190: /)).toBeDefined();
  });

  it("filters by text content", () => {
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "pizza" } });
    expect(screen.getByText(/0: /)).toBeDefined();
    expect(screen.queryByText(/^1: /)).toBeNull();
  });

  it("calls onSelect when a dropdown item is clicked", () => {
    const onSelect = jest.fn();
    render(<ReviewSelector reviews={reviews} onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "719" } });
    fireEvent.click(screen.getByText(/719: Delivery/));
    expect(onSelect).toHaveBeenCalledWith(reviews[2]);
  });
});
