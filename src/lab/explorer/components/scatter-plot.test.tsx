import React from "react";
import { render, screen } from "@testing-library/react";
import { ScatterPlot } from "./scatter-plot";

const xs = [1, 2, 3, 4, 5];
const ys = [2, 4, 5, 4, 6];

describe("ScatterPlot", () => {
  it("renders the plot container", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-plot")).toBeDefined();
  });

  it("renders one point per complete pair", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getAllByTestId("scatter-point")).toHaveLength(5);
  });

  it("skips pairs where either value is null", () => {
    render(<ScatterPlot xs={[1, null, 3]} ys={[1, 2, null]} xLabel="X" yLabel="Y" />);
    expect(screen.getAllByTestId("scatter-point")).toHaveLength(1);
  });

  it("renders a fit line when one can be computed", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-fit-line")).toBeDefined();
  });

  it("omits the fit line when x has zero variance", () => {
    render(<ScatterPlot xs={[2, 2, 2]} ys={[1, 2, 3]} xLabel="X" yLabel="Y" />);
    expect(screen.queryByTestId("scatter-fit-line")).toBeNull();
  });

  it("renders the axis labels", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByText("Rating")).toBeDefined();
    expect(screen.getByText("P0")).toBeDefined();
  });

  it("renders nothing when there are no complete pairs", () => {
    const { container } = render(
      <ScatterPlot xs={[null, null]} ys={[1, 2]} xLabel="X" yLabel="Y" />,
    );
    // eslint-disable-next-line testing-library/no-node-access -- asserting the component renders nothing
    expect(container.firstChild).toBeNull();
  });

  it("labels the x-axis endpoints", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-x-min").textContent).toBe("1");
    expect(screen.getByTestId("scatter-x-max").textContent).toBe("5");
  });

  it("labels the y-axis endpoints", () => {
    render(<ScatterPlot xs={xs} ys={ys} xLabel="Rating" yLabel="P0" />);
    expect(screen.getByTestId("scatter-y-min").textContent).toBe("2");
    expect(screen.getByTestId("scatter-y-max").textContent).toBe("6");
  });

  it("formats fractional endpoints without trailing zeros", () => {
    render(<ScatterPlot xs={[1.5, 2.25]} ys={[0, 1]} xLabel="X" yLabel="Y" />);
    expect(screen.getByTestId("scatter-x-min").textContent).toBe("1.5");
    expect(screen.getByTestId("scatter-x-max").textContent).toBe("2.25");
  });
});
