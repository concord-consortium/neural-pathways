import React from "react";
import { Series } from "../types/explorer-data";
import { FieldStats } from "../utils/statistics";
import { headlineStat } from "../utils/field-stat-format";
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
        {subset && <Sparkline counts={subset.counts} />}
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

/** The subset's shape alone. Scaled to its own peak — there is nothing to share one with. */
const Sparkline: React.FC<{ counts: number[] }> = ({ counts }) => {
  // reduce rather than Math.max(...counts): this codebase has hit the spread
  // argument ceiling before, and a bin count is not worth the risk.
  const peak = counts.reduce((max, count) => (count > max ? count : max), 0);
  const barWidth = counts.length > 0 ? 100 / counts.length : 100;
  return (
    <svg
      className="field-row-sparkline"
      viewBox={`0 0 100 ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      role="presentation"
    >
      {counts.map((count, i) => {
        const height = peak === 0 ? 0 : (count / peak) * SPARK_HEIGHT;
        return (
          <rect
            key={i}
            data-testid="field-row-spark-bar"
            x={i * barWidth}
            y={SPARK_HEIGHT - height}
            width={barWidth}
            height={height}
          />
        );
      })}
    </svg>
  );
};
