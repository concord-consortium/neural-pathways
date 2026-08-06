import React from "react";
import { Series } from "../types/explorer-data";
import { FieldStats, Bins } from "../utils/statistics";
import { headlineStat } from "../utils/field-stat-format";
import { formatAxisValue, barTitle } from "../utils/axis";
import { HistogramAxis } from "./histogram-axis";
import { HistogramBars } from "./histogram-bars";
import "./field-detail.scss";

interface FieldDetailProps {
  series: Series;
  bins: Bins;
  /** null when nothing in the selection has a value for this field. */
  subset: FieldStats | null;
  baseline: FieldStats;
  resultCount: number;
  totalCount: number;
  itemNoun: { singular: string; plural: string };
}

const BAR_AREA_HEIGHT = 48;

export const FieldDetail: React.FC<FieldDetailProps> = ({
  series, bins, subset, baseline, resultCount, totalCount, itemNoun,
}) => {
  const sets: { label: string; stats: FieldStats | null }[] = [
    { label: `these ${resultCount}`, stats: subset },
    { label: `all ${totalCount}`, stats: baseline },
  ];

  return (
    <div className="explorer-field-detail" data-testid="field-detail">
      <div className="explorer-field-detail-title" data-testid="field-detail-title">
        {series.label}
      </div>
      {series.description && (
        <div className="explorer-field-detail-description">{series.description}</div>
      )}

      {sets.map(({ label, stats }) => (
        <div className="explorer-field-detail-row" key={label}>
          <div className="explorer-field-detail-set-label" data-testid="field-detail-set-label">
            {label}
          </div>
          {stats === null ? (
            <div className="explorer-field-detail-absent">
              none in this selection
            </div>
          ) : (
            <HistogramBars
              counts={stats.counts}
              height={BAR_AREA_HEIGHT}
              className="explorer-field-detail-histogram"
              testId="field-detail-histogram"
              barClassName="explorer-field-detail-bar"
              barTestId="field-detail-bar"
              hit={{
                className: "explorer-field-detail-hit",
                testId: "field-detail-hit",
                title: (i, count) =>
                  barTitle(bins, i, count, series.label, itemNoun.plural, series.valueLabels),
              }}
              ariaLabel={`Distribution of ${series.label}`}
            />
          )}
          <div className="explorer-field-detail-numbers" data-testid="field-detail-numbers">
            {stats === null ? "" : (
              `n = ${stats.n} · ${headlineStat(series, stats)}`
              + ` · min ${formatAxisValue(stats.min)} · max ${formatAxisValue(stats.max)}`
            )}
          </div>
        </div>
      ))}

      {/* The two empty grid cells keep the axis under the histogram column,
          the same way the group rows above are laid out. */}
      <div className="explorer-field-detail-row">
        <div />
        <HistogramAxis bins={bins} valueLabels={series.valueLabels} />
        <div />
      </div>
    </div>
  );
};
