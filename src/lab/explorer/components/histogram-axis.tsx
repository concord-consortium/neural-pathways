import React from "react";
import { Bins } from "../utils/statistics";
import { axisValueLabel, formatAxisValue, selectTickIndices } from "../utils/axis";
import "./histogram-axis.scss";

const MAX_AXIS_LABELS = 10;

interface HistogramAxisProps {
  bins: Bins;
  /**
   * Display labels for the charted column's own values, so a binary field's
   * ticks read "negative"/"positive" rather than 0/1. Categorical mode only —
   * a numeric axis labels edges, which are positions rather than values. A
   * value the map does not list falls back to the number.
   */
  valueLabels?: Record<number, string>;
}

/**
 * The axis under a histogram: one cell per bar in categorical mode, so the
 * labels line up with the bars above them, and just the two endpoints in
 * numeric mode, where the bars are equal-width slices of one range.
 */
export const HistogramAxis: React.FC<HistogramAxisProps> = ({ bins, valueLabels }) => {
  const tickIndices = bins.mode === "categorical"
    ? new Set(selectTickIndices(bins.values.length, MAX_AXIS_LABELS))
    : new Set<number>();

  return (
    <div className="explorer-histogram-axis" data-testid="histogram-axis">
      {bins.mode === "categorical" ? (
        bins.values.map((value, i) => (
          <div className="explorer-axis-tick" key={i} data-testid="axis-tick">
            {tickIndices.has(i) ? axisValueLabel(value, valueLabels) : ""}
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
