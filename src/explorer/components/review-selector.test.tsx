// src/explorer/components/review-selector.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewSelector } from "./review-selector";
import { S3Review } from "../../shared/types/s3-data";

const makeReview = (id: string, text: string): S3Review => ({
  id,
  sources: { test: [0] },
  text,
  target: 1,
  target_label: "positive",
  pathway_scores: { default: [0, 0, 0, 0, 0, 0] },
  reconstruction_r2: { default: 0.9 },
  pathway_variance_fractions: { default: [1, 0, 0, 0, 0, 0] },
  name: "Place",
  city: "City",
  state: "ST",
  stars: 4,
  review_stars: 5,
  categories: "Food",
});

const reviews = [
  makeReview("r0", "Great pizza and wonderful service"),
  makeReview("r1", "Terrible experience, never again"),
  makeReview("r719", "Delivery was FAST"),
  makeReview("r7190", "The best tacos in town"),
];

describe("ReviewSelector", () => {
  it("renders the search input", () => {
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    expect(screen.getByText(/Search by review/)).toBeDefined();
  });

  it("filters by index number", () => {
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "2" } });
    expect(screen.getByText(/2: Delivery/)).toBeDefined();
  });

  it("filters by text content", () => {
    render(<ReviewSelector reviews={reviews} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "pizza" } });
    expect(screen.getByText(/0: Great pizza/)).toBeDefined();
  });

  it("calls onSelect when a dropdown item is clicked", () => {
    const onSelect = jest.fn();
    render(<ReviewSelector reviews={reviews} onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Delivery" } });
    fireEvent.click(screen.getByText(/2: Delivery/));
    expect(onSelect).toHaveBeenCalledWith(reviews[2]);
  });
});
