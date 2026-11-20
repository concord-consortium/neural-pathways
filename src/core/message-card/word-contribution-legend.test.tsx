import React from "react";
import { render, screen } from "@testing-library/react";
import { WordContributionLegend } from "./word-contribution-legend";

describe("WordContributionLegend", () => {
  it("is one image whose name speaks the range", () => {
    render(<WordContributionLegend max={0.2598309945043924} />);
    const name = "Word contribution, from minus 0.2598 to plus 0.2598";
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it("shows the caption and the range ends", () => {
    render(<WordContributionLegend max={0.2598309945043924} />);
    expect(screen.getByText("Word Contribution")).toBeInTheDocument();
    expect(screen.getByText("−0.2598")).toBeInTheDocument();
    expect(screen.getByText("+0.2598")).toBeInTheDocument();
  });
});
