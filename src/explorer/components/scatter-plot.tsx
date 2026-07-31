import React, { useMemo } from "react";
import { linearFit, isUsable } from "../utils/statistics";
import "./scatter-plot.scss";

interface ScatterPlotProps {
  xs: (number | null)[];
  ys: (number | null)[];
  xLabel: string;
  yLabel: string;
}

const WIDTH = 100;
const HEIGHT = 60;
const POINT_RADIUS = 0.5;

export const ScatterPlot: React.FC<ScatterPlotProps> = ({ xs, ys, xLabel, yLabel }) => {
  const points = useMemo(() => {
    const collected: [number, number][] = [];
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      const y = ys[i];
      if (!isUsable(x) || !isUsable(y)) continue;
      collected.push([x, y]);
    }
    return collected;
  }, [xs, ys]);

  const fit = useMemo(() => linearFit(xs, ys), [xs, ys]);

  if (points.length === 0) return null;

  const xValues = points.map(p => p[0]);
  const yValues = points.map(p => p[1]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const scaleX = (x: number) => (maxX === minX ? WIDTH / 2 : ((x - minX) / (maxX - minX)) * WIDTH);
  // SVG y grows downward, so invert.
  const scaleY = (y: number) => (maxY === minY ? HEIGHT / 2 : HEIGHT - ((y - minY) / (maxY - minY)) * HEIGHT);

  return (
    <div className="explorer-scatter-plot" data-testid="scatter-plot">
      <div className="explorer-scatter-y-label">{yLabel}</div>
      <svg
        className="explorer-scatter-canvas"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${yLabel} against ${xLabel}`}
      >
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={scaleX(x)}
            cy={scaleY(y)}
            r={POINT_RADIUS}
            data-testid="scatter-point"
          />
        ))}
        {fit && (
          <line
            x1={scaleX(minX)}
            y1={scaleY(fit.slope * minX + fit.intercept)}
            x2={scaleX(maxX)}
            y2={scaleY(fit.slope * maxX + fit.intercept)}
            data-testid="scatter-fit-line"
          />
        )}
      </svg>
      <div className="explorer-scatter-x-label">{xLabel}</div>
    </div>
  );
};
