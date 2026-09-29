import React from "react";
import { render, screen } from "@testing-library/react";
import { ReviewPanel } from "./review-panel";
import { S3Item } from "../types/viz-data";

const reviews: S3Item[] = [
  {
    id: "a1b2c3",
    sources: { train: [0] },
    text: "tarrak vosh krenn",
    target: 1,
    target_label: "approach",
    pathway_scores: { "fit-1": [0.5, -0.3] },
    pathway_variance_fractions: { "fit-1": [0.6, 0.3] },
  },
];

describe("ReviewPanel", () => {
  it("uses the item noun in the search placeholder", () => {
    render(
      <ReviewPanel
        reviews={reviews}
        selectedReview={undefined}
        onSelectReview={jest.fn()}
        activationsLoading={false}
        itemNoun="conversation"
      />,
    );
    expect(screen.getByText("Search by conversation # or text...")).toBeInTheDocument();
  });

  it("uses a different item noun when the dataset calls for it", () => {
    render(
      <ReviewPanel
        reviews={reviews}
        selectedReview={undefined}
        onSelectReview={jest.fn()}
        activationsLoading={false}
        itemNoun="review"
      />,
    );
    expect(screen.getByText("Search by review # or text...")).toBeInTheDocument();
  });
});
