import React from "react";
import { render, screen } from "@testing-library/react";
import { DistributionComparison } from "./distribution-comparison";
import { compareGroups } from "../utils/statistics";

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

  it("renders nothing when there are no groups", () => {
    const empty = compareGroups([], []);
    const { container } = render(<DistributionComparison comparison={empty} groupLabels={{}} />);
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });
});
