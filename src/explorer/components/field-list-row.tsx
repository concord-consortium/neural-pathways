import React from "react";
import { Series } from "../types/explorer-data";
import { FieldStats } from "../utils/statistics";
import { headlineStat } from "../utils/field-stat-format";
import { HistogramBars } from "./histogram-bars";
import "./field-list-row.scss";

interface FieldListRowProps {
  series: Series;
  /** null when nothing in the selection has a value for this field. */
  subset: FieldStats | null;
  /** null when the field has no usable values anywhere — an unselectable row. */
  baseline: FieldStats | null;
  selected: boolean;
  onSelect: () => void;
}

const SPARK_HEIGHT = 20;

export const FieldListRow: React.FC<FieldListRowProps> = ({
  series, subset, baseline, selected, onSelect,
}) => {
  const testId = `field-row-${series.key}`;
  const content = (
    <>
      <span className="field-row-label">{series.label}</span>
      <span className="field-row-stat" data-testid="field-row-subset">
        {headlineStat(series, subset)}
      </span>
      <span className="field-row-stat" data-testid="field-row-baseline">
        {headlineStat(series, baseline)}
      </span>
      <span className="field-row-spark">
        {/* The subset's shape alone, scaled to its own peak — there is nothing
            in the list for it to share one with. No hover targets and no axis:
            this is a shape to scan, and the detail pane is where it is read. */}
        {subset && (
          <HistogramBars
            counts={subset.counts}
            height={SPARK_HEIGHT}
            className="field-row-sparkline"
            barTestId="field-row-spark-bar"
          />
        )}
      </span>
    </>
  );

  // A field with no values anywhere still appears — that is what makes this
  // view a directory of what the dataset has — but it opens nothing, so it is
  // not a button.
  if (baseline === null) {
    return (
      <div className="field-row no-data" data-testid={testId} title={series.description}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`field-row${selected ? " selected" : ""}`}
      data-testid={testId}
      title={series.description}
      onClick={onSelect}
    >
      {content}
    </button>
  );
};
