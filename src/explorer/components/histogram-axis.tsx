import React from "react";
import { Bins } from "../utils/statistics";
import { formatAxisValue, selectTickIndices } from "../utils/axis";
import "./histogram-axis.scss";

const MAX_AXIS_LABELS = 10;

interface HistogramAxisProps {
  bins: Bins;
}

/**
 * The axis under a histogram: one cell per bar in categorical mode, so the
 * labels line up with the bars above them, and just the two endpoints in
 * numeric mode, where the bars are equal-width slices of one range.
 */
export const HistogramAxis: React.FC<HistogramAxisProps> = ({ bins }) => {
  const tickIndices = bins.mode === "categorical"
    ? new Set(selectTickIndices(bins.values.length, MAX_AXIS_LABELS))
    : new Set<number>();

  return (
    <div className="explorer-histogram-axis" data-testid="histogram-axis">
      {bins.mode === "categorical" ? (
        bins.values.map((value, i) => (
          <div className="explorer-axis-tick" key={i} data-testid="axis-tick">
            {tickIndices.has(i) ? formatAxisValue(value) : ""}
          </div>
        ))
      ) : (
        <>
          <div className="explorer-axis-end" data-testid="axis-end">
            {formatAxisValue(bins.edges[0])}
          </div>
          <div className="explorer-axis-end" data-testid="axis-end">
            {formatAxisValue(bins.edges[bins.edges.length - 1])}
          </div>
        </>
      )}
    </div>
  );
};
