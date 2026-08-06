import React from "react";
import { render, screen } from "@testing-library/react";
import { FieldDetail } from "./field-detail";
import { Series } from "../types/explorer-data";
import { FieldStats, Bins } from "../utils/statistics";

const series: Series = {
  key: "review_stars", label: "Review rating", kind: "attribute", attributeType: "integer",
  description: "The star rating on this review.", values: [],
};

const bins: Bins = { mode: "categorical", values: [1, 2, 3, 4, 5] };

const subset: FieldStats = { n: 145, mean: 2.9, min: 1, max: 5, counts: [60, 40, 25, 15, 5] };
const baseline: FieldStats = { n: 3000, mean: 3.7, min: 1, max: 5, counts: [300, 400, 600, 900, 800] };

const noun = { singular: "review", plural: "reviews" };

const renderDetail = (props: Partial<React.ComponentProps<typeof FieldDetail>> = {}) =>
  render(
    <FieldDetail
      series={series} bins={bins} subset={subset} baseline={baseline}
      resultCount={145} totalCount={3000} itemNoun={noun} {...props}
    />,
  );

describe("FieldDetail", () => {
  it("names the field and shows its description", () => {
    renderDetail();
    expect(screen.getByTestId("field-detail-title").textContent).toContain("Review rating");
    expect(screen.getByText("The star rating on this review.")).toBeDefined();
  });

  it("renders one histogram per set", () => {
    renderDetail();
    expect(screen.getAllByTestId("field-detail-histogram")).toHaveLength(2);
  });

  it("draws one bar per bin in each histogram", () => {
    renderDetail();
    // 5 bins x 2 sets.
    expect(screen.getAllByTestId("field-detail-bar")).toHaveLength(10);
  });

  it("scales each histogram against its own peak", () => {
    renderDetail();
    const bars = screen.getAllByTestId("field-detail-bar");
    // The subset's first bar is its own peak (60 of 60), so it is full height.
    // The baseline's first bar is 300 of 900, so it is not — a shared peak
    // would have flattened the subset instead.
    expect(bars[0].getAttribute("height")).toBe("48");
    expect(Number(bars[5].getAttribute("height"))).toBeLessThan(48);
  });

  it("reports each set's count, headline, min and max", () => {
    renderDetail();
    const rows = screen.getAllByTestId("field-detail-numbers");
    expect(rows[0].textContent).toContain("n = 145");
    expect(rows[0].textContent).toContain("mean 2.9");
    expect(rows[0].textContent).toContain("min 1");
    expect(rows[0].textContent).toContain("max 5");
    expect(rows[1].textContent).toContain("n = 3000");
  });

  it("labels the two rows with the item noun", () => {
    renderDetail({ itemNoun: { singular: "conversation", plural: "conversations" } });
    const labels = screen.getAllByTestId("field-detail-set-label");
    expect(labels[0].textContent).toBe("these 145");
    expect(labels[1].textContent).toBe("all 3000");
    expect(screen.getByTestId("field-detail").textContent).toContain("conversations");
  });

  it("renders the shared axis under the histograms", () => {
    renderDetail();
    // The axis itself is HistogramAxis's contract, covered by its own tests.
    // What matters here is that this pane renders exactly one, from these bins.
    expect(screen.getAllByTestId("histogram-axis")).toHaveLength(1);
    expect(screen.getAllByTestId("axis-tick").map(t => t.textContent))
      .toEqual(["1", "2", "3", "4", "5"]);
  });

  it("gives every bar a hover title naming its slice and count", () => {
    renderDetail();
    const titles = screen.getAllByTestId("field-detail-hit").map(hit => hit.textContent);
    expect(titles[0]).toBe("Review rating 1 — 60 reviews");
  });

  it("says so when the selection holds no values for the field", () => {
    renderDetail({ subset: null });
    expect(screen.getByTestId("field-detail").textContent).toContain("none in this selection");
    // The baseline still draws, so the reader learns what the field looks like.
    expect(screen.getAllByTestId("field-detail-histogram")).toHaveLength(1);
  });

  it("passes numeric bins through to the axis", () => {
    renderDetail({ bins: { mode: "numeric", edges: [0, 0.5, 1, 1.5, 2] } });
    expect(screen.getAllByTestId("axis-end").map(e => e.textContent)).toEqual(["0", "2"]);
  });
});
