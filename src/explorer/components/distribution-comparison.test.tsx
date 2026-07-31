import React from "react";
import { render, screen, within } from "@testing-library/react";
import { DistributionComparison } from "./distribution-comparison";
import { compareGroups, GroupComparison } from "../utils/statistics";

const comparison = compareGroups([0, 0, 0, 1, 1, 1], [1, 2, 3, 7, 8, 9], 4);

describe("DistributionComparison", () => {
  it("renders the container", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} scoreLabel="Score"
      />,
    );
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
  });

  it("renders one row per group using the supplied labels", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} scoreLabel="Score"
      />,
    );
    expect(screen.getByTestId("group-row-0").textContent).toContain("no");
    expect(screen.getByTestId("group-row-1").textContent).toContain("yes");
  });

  it("shows each group's n and mean", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} scoreLabel="Score"
      />,
    );
    expect(screen.getByTestId("group-row-0").textContent).toContain("n = 3");
    expect(screen.getByTestId("group-row-0").textContent).toContain("2.00");
  });

  it("reports the separation in standard deviations", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} scoreLabel="Score"
      />,
    );
    expect(screen.getByText(/6\.00σ/)).toBeDefined();
  });

  it("falls back to the raw value when no label is supplied", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{}} scoreLabel="Score" />);
    expect(screen.getByTestId("group-row-0").textContent).toContain("0");
  });

  it("omits the separation line when it cannot be computed", () => {
    const single = compareGroups([0, 0, 0], [1, 2, 3], 4);
    render(
      <DistributionComparison comparison={single} groupLabels={{ 0: "no" }} scoreLabel="Score" />,
    );
    expect(screen.queryByText(/σ/)).toBeNull();
  });

  it("scales each group against its own peak, not a shared one", () => {
    // Group 0 has three observations in its tallest bin, group 1 has one. Under a
    // shared peak group 1's only bar would be a third of the height and would read
    // as "nothing here"; scaled against its own peak it fills the panel.
    const lopsided = compareGroups([0, 0, 0, 1], [1, 1, 1, 2], 2);
    render(<DistributionComparison comparison={lopsided} groupLabels={{}} scoreLabel="Score" />);

    const big = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar");
    const small = within(screen.getByTestId("group-row-1")).getAllByTestId("group-bar");
    expect(big.map(bar => bar.getAttribute("height"))).toEqual(["48", "0"]);
    expect(small.map(bar => bar.getAttribute("height"))).toEqual(["0", "48"]);
  });

  it("renders a group whose bins are all empty without dividing by zero", () => {
    const empty: GroupComparison = {
      groups: [{ value: 0, n: 0, mean: 0, sd: 0, counts: [0, 0] }],
      bins: { mode: "numeric", edges: [0, 1, 2] },
      separationSd: null,
    };
    render(<DistributionComparison comparison={empty} groupLabels={{}} scoreLabel="Score" />);
    const bars = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar");
    expect(bars.map(bar => bar.getAttribute("height"))).toEqual(["0", "0"]);
  });

  it("renders nothing when there are no groups", () => {
    const empty = compareGroups([], []);
    const { container } = render(
      <DistributionComparison comparison={empty} groupLabels={{}} scoreLabel="Score" />,
    );
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });

  it("renders one shared axis for the whole stack", () => {
    render(
      <DistributionComparison comparison={comparison} groupLabels={{}} scoreLabel="Score" />,
    );
    expect(screen.getAllByTestId("histogram-axis")).toHaveLength(1);
  });

  it("labels every categorical bar when they all fit", () => {
    // Scores 1,2,3,7,8,9 -> six categorical bars, all labelled.
    render(
      <DistributionComparison comparison={comparison} groupLabels={{}} scoreLabel="Score" />,
    );
    const axis = screen.getByTestId("histogram-axis");
    expect(axis.textContent).toContain("1");
    expect(axis.textContent).toContain("7");
    expect(axis.textContent).toContain("9");
  });

  it("thins the categorical labels when there are too many bars", () => {
    const many = Array.from({ length: 18 }, (_, i) => i + 1);
    const wide = compareGroups(many.map(() => 0), many);
    render(<DistributionComparison comparison={wide} groupLabels={{}} scoreLabel="Score" />);
    const ticks = within(screen.getByTestId("histogram-axis")).getAllByTestId("axis-tick");
    // One cell per bar so the labels stay aligned, but only some carry text.
    expect(ticks).toHaveLength(18);
    const labelled = ticks.filter(tick => tick.textContent !== "");
    expect(labelled.length).toBeLessThanOrEqual(11);
    expect(labelled.length).toBeGreaterThan(1);
  });

  it("labels only the ends in numeric mode", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const continuous = compareGroups(many.map(() => 0), many, 4);
    render(
      <DistributionComparison comparison={continuous} groupLabels={{}} scoreLabel="Score" />,
    );
    const ends = within(screen.getByTestId("histogram-axis")).getAllByTestId("axis-end");
    expect(ends.map(end => end.textContent)).toEqual(["1", "30"]);
    expect(screen.queryAllByTestId("axis-tick")).toHaveLength(0);
  });

  it("gives every bar a hover target naming the value and the count", () => {
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{}} scoreLabel="Business stars"
      />,
    );
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits).toHaveLength(6);
    expect(hits[0].textContent).toBe("Business stars 1 — 1 reviews");
  });

  it("keeps a zero-count bar hoverable", () => {
    // Group 0 holds only score 1, so its bar for score 9 is empty — and must still
    // report itself, because "nothing here" is information.
    render(
      <DistributionComparison
        comparison={comparison} groupLabels={{}} scoreLabel="Business stars"
      />,
    );
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits[5].textContent).toBe("Business stars 9 — 0 reviews");
  });

  it("names the bin range on hover in numeric mode", () => {
    const many = Array.from({ length: 30 }, (_, i) => i + 1);
    const continuous = compareGroups(many.map(() => 0), many, 4);
    render(<DistributionComparison comparison={continuous} groupLabels={{}} scoreLabel="P0" />);
    const hits = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar-hit");
    expect(hits).toHaveLength(4);
    expect(hits[0].textContent).toBe("P0 1 to 8.25 — 8 reviews");
  });
});
