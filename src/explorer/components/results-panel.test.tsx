import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsPanel } from "./results-panel";
import { S3Item } from "../../shared/types/s3-data";

const makeItem = (id: string, text: string, scores: number[]): S3Item => ({
  id,
  sources: { test: [0] },
  text,
  target: 1,
  target_label: "positive",
  pathway_scores: { fit_a: scores },
  reconstruction_r2: { fit_a: 0.9 },
  pathway_variance_fractions: { fit_a: scores.map(() => 1 / scores.length) },
});

const items = [
  makeItem("r0", "Great pizza and wonderful service that keeps me coming back", [0.8, 0.3]),
  makeItem("r1", "Terrible experience, never coming back to this place ever again", [0.1, 0.9]),
];

const defaultProps = {
  items,
  fitName: "fit_a",
  selectedItemId: null as string | null,
  onSelectItem: jest.fn(),
  maxAbsScore: 1,
  resultCount: 2,
  totalCount: 100,
};

describe("ResultsPanel", () => {
  it("renders a list of item cards", () => {
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
    // 2 items x 2 pathways = 4 bars
    expect(bars.length).toBe(4);
    // First item, first pathway: 0.8 / 1 = 80%
    expect((bars[0] as HTMLElement).style.height).toBe("80%");
    expect((bars[0] as HTMLElement).style.backgroundColor).toBe("rgb(231, 76, 60)");
  });

  it("highlights the selected item", () => {
    render(<ResultsPanel {...defaultProps} selectedItemId="r0" />);
    // eslint-disable-next-line testing-library/no-node-access -- checking CSS class on parent element
    const selectedCard = screen.getByText(/Great pizza/).closest(".results-panel-card");
    expect(selectedCard?.classList.contains("selected")).toBe(true);
  });

  it("calls onSelectItem when a card is clicked", () => {
    const onSelect = jest.fn();
    render(<ResultsPanel {...defaultProps} onSelectItem={onSelect} />);
    fireEvent.click(screen.getByText(/Terrible experience/));
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  // The results list is a snippet view over item.text only; the observer's
  // note must never leak into it. See flatten-item.test.ts for the matching
  // constraint on the search object.
  it("never renders the observation note, even when the item carries one", () => {
    const itemWithObservation: S3Item = {
      ...makeItem("r2", "A conversation about the ship's hull temperature", [0.4, 0.2]),
      observation: "The observer noted an unusually flat tone throughout this exchange.",
    };
    render(<ResultsPanel {...defaultProps} items={[itemWithObservation]} resultCount={1} />);
    expect(screen.queryByText(/unusually flat tone/i)).not.toBeInTheDocument();
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
