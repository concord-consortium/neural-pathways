import React from "react";
import { render, screen } from "@testing-library/react";
import { HistogramAxis } from "./histogram-axis";
import { Bins } from "../utils/statistics";

describe("HistogramAxis", () => {
  it("labels every categorical value when they all fit", () => {
    const bins: Bins = { mode: "categorical", values: [1, 2, 3, 4, 5] };
    render(<HistogramAxis bins={bins} />);
    expect(screen.getAllByTestId("axis-tick").map(t => t.textContent))
      .toEqual(["1", "2", "3", "4", "5"]);
  });

  it("thins the labels but keeps a cell per value when there are too many", () => {
    const bins: Bins = { mode: "categorical", values: [...Array(20).keys()] };
    render(<HistogramAxis bins={bins} />);
    const ticks = screen.getAllByTestId("axis-tick");
    // One cell per bar, so the ticks stay aligned with the bars above them...
    expect(ticks).toHaveLength(20);
    // ...but only some carry text.
    expect(ticks.filter(t => t.textContent !== "").length).toBeLessThan(20);
  });

  it("labels a categorical tick with the dataset's value label", () => {
    const bins: Bins = { mode: "categorical", values: [0, 1] };
    render(<HistogramAxis bins={bins} valueLabels={{ 0: "negative", 1: "positive" }} />);
    expect(screen.getAllByTestId("axis-tick").map(t => t.textContent))
      .toEqual(["negative", "positive"]);
  });

  it("falls back to the number for a value the map does not list", () => {
    // A partial map must degrade to the number rather than mislabel a tick.
    const bins: Bins = { mode: "categorical", values: [0, 1, 2] };
    render(<HistogramAxis bins={bins} valueLabels={{ 0: "low", 1: "high" }} />);
    expect(screen.getAllByTestId("axis-tick").map(t => t.textContent))
      .toEqual(["low", "high", "2"]);
  });

  it("labels a numeric axis with its two endpoints and no ticks", () => {
    const bins: Bins = { mode: "numeric", edges: [0, 0.5, 1, 1.5, 2] };
    render(<HistogramAxis bins={bins} />);
    expect(screen.getAllByTestId("axis-end").map(e => e.textContent)).toEqual(["0", "2"]);
    expect(screen.queryAllByTestId("axis-tick")).toHaveLength(0);
  });

  it("leaves the numeric endpoints as numbers even when value labels are supplied", () => {
    // The endpoints are bin edges — positions along a range, not values of the
    // column — so a value label would be naming something else entirely.
    const bins: Bins = { mode: "numeric", edges: [0, 0.5, 1] };
    render(<HistogramAxis bins={bins} valueLabels={{ 0: "negative", 1: "positive" }} />);
    expect(screen.getAllByTestId("axis-end").map(e => e.textContent)).toEqual(["0", "1"]);
  });
});
