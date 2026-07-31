import React from "react";
import { render, screen, within } from "@testing-library/react";
import { DistributionComparison } from "./distribution-comparison";
import { compareGroups, GroupComparison } from "../utils/statistics";

const comparison = compareGroups([0, 0, 0, 1, 1, 1], [1, 2, 3, 7, 8, 9], 4);

describe("DistributionComparison", () => {
  it("renders the container", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} />);
    expect(screen.getByTestId("distribution-comparison")).toBeDefined();
  });

  it("renders one row per group using the supplied labels", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} />);
    expect(screen.getByTestId("group-row-0").textContent).toContain("no");
    expect(screen.getByTestId("group-row-1").textContent).toContain("yes");
  });

  it("shows each group's n and mean", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} />);
    expect(screen.getByTestId("group-row-0").textContent).toContain("n = 3");
    expect(screen.getByTestId("group-row-0").textContent).toContain("2.00");
  });

  it("reports the separation in standard deviations", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{ 0: "no", 1: "yes" }} />);
    expect(screen.getByText(/6\.00σ/)).toBeDefined();
  });

  it("falls back to the raw value when no label is supplied", () => {
    render(<DistributionComparison comparison={comparison} groupLabels={{}} />);
    expect(screen.getByTestId("group-row-0").textContent).toContain("0");
  });

  it("omits the separation line when it cannot be computed", () => {
    const single = compareGroups([0, 0, 0], [1, 2, 3], 4);
    render(<DistributionComparison comparison={single} groupLabels={{ 0: "no" }} />);
    expect(screen.queryByText(/σ/)).toBeNull();
  });

  it("scales each group against its own peak, not a shared one", () => {
    // Group 0 has three observations in its tallest bin, group 1 has one. Under a
    // shared peak group 1's only bar would be a third of the height and would read
    // as "nothing here"; scaled against its own peak it fills the panel.
    const lopsided = compareGroups([0, 0, 0, 1], [1, 1, 1, 2], 2);
    render(<DistributionComparison comparison={lopsided} groupLabels={{}} />);

    const big = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar");
    const small = within(screen.getByTestId("group-row-1")).getAllByTestId("group-bar");
    expect(big.map(bar => bar.getAttribute("height"))).toEqual(["48", "0"]);
    expect(small.map(bar => bar.getAttribute("height"))).toEqual(["0", "48"]);
  });

  it("renders a group whose bins are all empty without dividing by zero", () => {
    const empty: GroupComparison = {
      groups: [{ value: 0, n: 0, mean: 0, sd: 0, counts: [0, 0] }],
      binEdges: [0, 1, 2],
      separationSd: null,
    };
    render(<DistributionComparison comparison={empty} groupLabels={{}} />);
    const bars = within(screen.getByTestId("group-row-0")).getAllByTestId("group-bar");
    expect(bars.map(bar => bar.getAttribute("height"))).toEqual(["0", "0"]);
  });

  it("renders nothing when there are no groups", () => {
    const empty = compareGroups([], []);
    const { container } = render(<DistributionComparison comparison={empty} groupLabels={{}} />);
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });
});
