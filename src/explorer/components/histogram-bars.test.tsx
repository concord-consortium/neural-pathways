import React from "react";
import { render, screen } from "@testing-library/react";
import { HistogramBars } from "./histogram-bars";

const renderBars = (props: Partial<React.ComponentProps<typeof HistogramBars>> = {}) =>
  render(
    <HistogramBars
      counts={[1, 2, 4]} height={48} className="chart" barTestId="bar" {...props}
    />,
  );

describe("HistogramBars", () => {
  it("draws one bar per count", () => {
    renderBars();
    expect(screen.getAllByTestId("bar")).toHaveLength(3);
  });

  it("splits the width evenly between the bars", () => {
    renderBars({ counts: [1, 1, 1, 1] });
    const bars = screen.getAllByTestId("bar");
    expect(bars.map(bar => bar.getAttribute("width"))).toEqual(["25", "25", "25", "25"]);
    expect(bars.map(bar => bar.getAttribute("x"))).toEqual(["0", "25", "50", "75"]);
  });

  it("scales the bars against this chart's own peak", () => {
    renderBars({ counts: [1, 2, 4], height: 48 });
    const bars = screen.getAllByTestId("bar");
    // The tallest bar fills the chart, and the others are its fractions —
    // nothing here consults any other chart's counts.
    expect(bars.map(bar => bar.getAttribute("height"))).toEqual(["12", "24", "48"]);
  });

  it("draws flat bars for an all-empty set rather than dividing by zero", () => {
    renderBars({ counts: [0, 0] });
    expect(screen.getAllByTestId("bar").map(bar => bar.getAttribute("height")))
      .toEqual(["0", "0"]);
  });

  it("carries the caller's class alongside the shared one", () => {
    renderBars({ barClassName: "explorer-group-bar" });
    // The shared class paints the bar; the caller's stays as its own hook.
    expect(screen.getAllByTestId("bar")[0].getAttribute("class"))
      .toBe("explorer-histogram-bar explorer-group-bar");
  });

  it("omits the hit targets when no hover text is offered", () => {
    renderBars();
    expect(screen.queryAllByTestId("hit")).toHaveLength(0);
  });

  it("gives each bar a full-height hit target carrying its title", () => {
    renderBars({
      counts: [3, 0],
      hit: { className: "own-hit", testId: "hit", title: (i, count) => `bin ${i}: ${count}` },
    });
    const hits = screen.getAllByTestId("hit");
    expect(hits.map(hit => hit.textContent)).toEqual(["bin 0: 3", "bin 1: 0"]);
    // Full height, so the empty second bin is hoverable too.
    expect(hits.map(hit => hit.getAttribute("height"))).toEqual(["48", "48"]);
  });

  it("paints the hit targets after the bars so they sit on top", () => {
    renderBars({
      counts: [1, 2],
      ariaLabel: "chart",
      hit: { className: "own-hit", testId: "hit", title: () => "t" },
    });
    // eslint-disable-next-line testing-library/no-node-access -- paint order is document order
    const ids = Array.from(screen.getByRole("img").children)
      .map(rect => rect.getAttribute("data-testid"));
    expect(ids).toEqual(["bar", "bar", "hit", "hit"]);
  });

  it("names the chart for assistive tech when given a label", () => {
    renderBars({ ariaLabel: "Distribution of Review rating" });
    expect(screen.getByRole("img", { name: "Distribution of Review rating" })).toBeDefined();
  });

  it("is presentational when there is nothing to announce", () => {
    // A sparkline repeats numbers already printed beside it, so announcing it
    // as an image would only add noise.
    renderBars();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders nothing but the chart for an empty count list", () => {
    renderBars({ counts: [] });
    expect(screen.queryAllByTestId("bar")).toHaveLength(0);
  });
});
