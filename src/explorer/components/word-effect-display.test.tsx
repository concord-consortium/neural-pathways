import React from "react";
import { render, screen } from "@testing-library/react";
import { WordEffectDisplay } from "./word-effect-display";

const mockWords = [
  { word: "[CLS]", scores: [0.1, -0.2] },
  { word: "great", scores: [0.5, -0.3] },
  { word: "food", scores: [-0.2, 0.4] },
  { word: "[SEP]", scores: [0.05, -0.1] },
];

describe("WordEffectDisplay", () => {
  it("renders the pathway label", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });

  it("renders word spans with background colors", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    const greatSpan = screen.getByText("great");
    // Positive score -> red background
    expect(greatSpan.style.backgroundColor).toContain("231");
    const foodSpan = screen.getByText("food");
    // Negative score -> blue background
    expect(foodSpan.style.backgroundColor).toContain("52");
  });

  it("filters out [CLS] and [SEP] tokens", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={mockWords} />);
    expect(screen.queryByText("[CLS]")).toBeNull();
    expect(screen.queryByText("[SEP]")).toBeNull();
  });

  it("handles empty words array", () => {
    render(<WordEffectDisplay pathwayIndex={0} words={[]} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
  });
});
