import React from "react";
import { render, screen } from "@testing-library/react";
import { WordEffectsPanel } from "./word-effects-panel";
import { WordEffect } from "../types/explorer-data";

const mockWords: WordEffect[] = [
  { word: "great", scores: [0.5, -0.3, 0.1] },
  { word: "food", scores: [-0.2, 0.4, -0.5] },
];

describe("WordEffectsPanel", () => {
  it("renders one block per selected pathway", () => {
    const selected = new Set([0, 2]);
    render(<WordEffectsPanel words={mockWords} selectedPathways={selected} />);
    expect(screen.getByText("Pathway 0")).toBeDefined();
    expect(screen.getByText("Pathway 2")).toBeDefined();
    expect(screen.queryByText("Pathway 1")).toBeNull();
  });

  it("renders nothing when no pathways are selected", () => {
    const selected = new Set<number>();
    const { container } = render(
      <WordEffectsPanel words={mockWords} selectedPathways={selected} />
    );
    expect(container.querySelector(".word-effects-panel")).toBeNull();
  });

  it("renders pathways in ascending index order", () => {
    const selected = new Set([2, 0]);
    render(<WordEffectsPanel words={mockWords} selectedPathways={selected} />);
    const headers = screen.getAllByText(/^Pathway \d+$/);
    expect(headers[0].textContent).toBe("Pathway 0");
    expect(headers[1].textContent).toBe("Pathway 2");
  });
});
