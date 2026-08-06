import React from "react";
import { Series } from "../types/explorer-data";
import { FieldStats, Bins } from "../utils/statistics";
import { headlineStat } from "../utils/field-stat-format";
import { formatAxisValue, barTitle } from "../utils/axis";
import { HistogramAxis } from "./histogram-axis";
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
  const binCount = bins.mode === "categorical" ? bins.values.length : bins.edges.length - 1;
  const barWidth = binCount > 0 ? 100 / binCount : 100;

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
            <Histogram
              stats={stats} bins={bins} barWidth={barWidth}
              fieldLabel={series.label} plural={itemNoun.plural}
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
        <HistogramAxis bins={bins} />
        <div />
      </div>
    </div>
  );
};

interface HistogramProps {
  stats: FieldStats;
  bins: Bins;
  barWidth: number;
  fieldLabel: string;
  plural: string;
}

/**
 * Scaled against its own peak, never a peak shared with the other set. A
 * 145-item selection against a 3,000-item baseline on a shared peak flattens
 * the selection into an unreadable line — and the selection is the interesting
 * one. Each row prints its own n, so the size difference stays on screen.
 */
const Histogram: React.FC<HistogramProps> = ({ stats, bins, barWidth, fieldLabel, plural }) => {
  const peak = stats.counts.reduce((max, count) => (count > max ? count : max), 0);
  return (
    <svg
      className="explorer-field-detail-histogram"
      data-testid="field-detail-histogram"
      viewBox={`0 0 100 ${BAR_AREA_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Distribution of ${fieldLabel}`}
    >
      {stats.counts.map((count, i) => {
        const height = peak === 0 ? 0 : (count / peak) * BAR_AREA_HEIGHT;
        return (
          <rect
            key={`bar-${i}`}
            className="explorer-field-detail-bar"
            data-testid="field-detail-bar"
            x={i * barWidth}
            y={BAR_AREA_HEIGHT - height}
            width={barWidth}
            height={height}
          />
        );
      })}
      {/* Painted after the bars so they sit on top, full height so an empty bin
          is still hoverable. */}
      {stats.counts.map((count, i) => (
        <rect
          key={`hit-${i}`}
          className="explorer-field-detail-hit"
          data-testid="field-detail-hit"
          x={i * barWidth}
          y={0}
          width={barWidth}
          height={BAR_AREA_HEIGHT}
        >
          <title>{barTitle(bins, i, count, fieldLabel, plural)}</title>
        </rect>
      ))}
    </svg>
  );
};
