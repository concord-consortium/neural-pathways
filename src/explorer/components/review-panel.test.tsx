import React from "react";
import { render, screen } from "@testing-library/react";
import { ReviewPanel } from "./review-panel";
import { S3Review } from "../../shared/types/s3-data";
import { AttributeDefinition } from "../../shared/types/attributes";

const mockReview: S3Review = {
  id: "r719",
  sources: { test: [0] },
  text: "Delivery was FAST. White pizza was delicious.",
  target: 1,
  target_label: "positive",
  pathway_scores: { default: [1.01, -0.52, -0.11, -0.50, -1.15, -0.21] },
  reconstruction_r2: { default: 0.9662 },
  pathway_variance_fractions: { default: [0.98, 0.01, 0.0, 0.0, 0.01, 0.0] },
  name: "Joe's Pizza",
  city: "Philadelphia",
  state: "PA",
  stars: 4.0,
  review_stars: 5,
  categories: "Pizza, Italian",
};

const testAttributes: AttributeDefinition[] = [
  { key: "target", label: "Actual sentiment", description: "Ground truth.", type: "binary" },
  { key: "model_correct", label: "Model was correct", description: "Match.", type: "binary" },
];

const testGetValue = (_review: S3Review, key: string): number | null =>
  key === "target" ? 1 : null;

const renderPanel = (review: S3Review = mockReview, r2: number | null = 0.9662) =>
  render(
    <ReviewPanel
      review={review}
      reconstructionR2={r2}
      attributes={testAttributes}
      getAttributeValue={testGetValue}
    />,
  );

describe("ReviewPanel", () => {
  it("renders the review text", () => {
    renderPanel();
    expect(screen.getByText("Delivery was FAST. White pizza was delicious.")).toBeDefined();
  });

  it("renders the classification badge", () => {
    renderPanel();
    expect(screen.getByText("positive")).toBeDefined();
  });

  it("renders the source badge", () => {
    renderPanel();
    expect(screen.getByText("test")).toBeDefined();
  });

  it("renders business info", () => {
    renderPanel();
    expect(screen.getByText(/Joe's Pizza/)).toBeDefined();
    expect(screen.getByText(/Philadelphia/)).toBeDefined();
  });

  it("renders categories", () => {
    renderPanel();
    expect(screen.getByText("Pizza, Italian")).toBeDefined();
  });

  it("renders R² value", () => {
    renderPanel();
    expect(screen.getByText("0.9662")).toBeDefined();
  });

  it("renders star rating", () => {
    renderPanel();
    // review_stars = 5, so 5 filled stars
    const starContainer = screen.getByTestId("review-stars");
    expect(starContainer.textContent).toContain("★★★★★");
  });

  it("hides R² when reconstructionR2 is null", () => {
    renderPanel(mockReview, null);
    expect(screen.queryByText("0.9662")).toBeNull();
  });

  it("renders classification badge with probability when classification is present", () => {
    const reviewWithClassification = {
      ...mockReview,
      classification: 1,
      classification_probability: 0.987654,
    };
    renderPanel(reviewWithClassification);
    expect(screen.getByText("predicted: positive (98.8%)")).toBeDefined();
  });

  it("renders negative classification badge", () => {
    const reviewWithClassification = {
      ...mockReview,
      classification: 0,
      classification_probability: 0.234,
    };
    renderPanel(reviewWithClassification);
    expect(screen.getByText("predicted: negative (23.4%)")).toBeDefined();
  });

  it("does not render classification badge when classification is absent", () => {
    renderPanel();
    expect(screen.queryByText(/predicted:/)).toBeNull();
  });
});

describe("ReviewPanel attributes", () => {
  it("renders chips for attributes that have values", () => {
    renderPanel();
    expect(screen.getByTestId("attribute-chip-target")).toBeDefined();
  });

  it("omits chips for attributes with no value", () => {
    renderPanel();
    expect(screen.queryByTestId("attribute-chip-model_correct")).toBeNull();
  });

  it("renders no chip container when the attribute list is empty", () => {
    render(
      <ReviewPanel
        review={mockReview}
        reconstructionR2={0.9662}
        attributes={[]}
        getAttributeValue={testGetValue}
      />,
    );
    expect(screen.queryByTestId("attribute-chips")).toBeNull();
  });
});
