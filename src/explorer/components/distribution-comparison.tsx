import React from "react";
import { GroupComparison } from "../utils/statistics";
import { barTitle } from "../utils/axis";
import { HistogramAxis } from "./histogram-axis";
import "./distribution-comparison.scss";

interface DistributionComparisonProps {
  comparison: GroupComparison;
  /** Maps a group's numeric value to a display label, e.g. { 0: "no", 1: "yes" }. */
  groupLabels: Record<number, string>;
  /** Name of the column variable being distributed, used in the hover text. */
  scoreLabel: string;
  itemNoun: { singular: string; plural: string };
}

const BAR_AREA_HEIGHT = 48;

export const DistributionComparison: React.FC<DistributionComparisonProps> = ({
  comparison, groupLabels, scoreLabel, itemNoun,
}) => {
  const { groups, bins, separationSd } = comparison;
  if (groups.length === 0) return null;

  const binCount = bins.mode === "categorical" ? bins.values.length : bins.edges.length - 1;
  const barWidth = binCount > 0 ? 100 / binCount : 100;

  return (
    <div className="explorer-distribution-comparison" data-testid="distribution-comparison">
      {groups.map(group => {
        // Each group is scaled against its own peak so the panels compare shape,
        // not raw count. A shared peak would flatten a group that is an order of
        // magnitude smaller than its counterpart into an unreadable line — and
        // that group is usually the interesting one. Each row prints its own n,
        // so the size difference is still on screen.
        const peak = group.counts.reduce((max, count) => (count > max ? count : max), 0);
        return (
          <div className="explorer-group-row" key={group.value} data-testid={`group-row-${group.value}`}>
            <div className="explorer-group-label">
              {groupLabels[group.value] ?? String(group.value)}
            </div>
            <svg
              className="explorer-group-histogram"
              viewBox={`0 0 100 ${BAR_AREA_HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Distribution for group ${groupLabels[group.value] ?? group.value}`}
            >
              {group.counts.map((count, i) => {
                const height = peak === 0 ? 0 : (count / peak) * BAR_AREA_HEIGHT;
                return (
                  <rect
                    key={`bar-${i}`}
                    className="explorer-group-bar"
                    x={i * barWidth}
                    y={BAR_AREA_HEIGHT - height}
                    width={barWidth}
                    height={height}
                    data-testid="group-bar"
                  />
                );
              })}
              {/* Hit targets are painted after the bars so they sit on top, and span
                  the full height so an empty bin is still hoverable. */}
              {group.counts.map((count, i) => (
                <rect
                  key={`hit-${i}`}
                  className="explorer-group-hit"
                  x={i * barWidth}
                  y={0}
                  width={barWidth}
                  height={BAR_AREA_HEIGHT}
                  data-testid="group-bar-hit"
                >
                  <title>{barTitle(bins, i, count, scoreLabel, itemNoun.plural)}</title>
                </rect>
              ))}
            </svg>
            <div className="explorer-group-stats">
              n = {group.n} · mean {group.mean.toFixed(2)}
            </div>
          </div>
        );
      })}

      <div className="explorer-group-row">
        <div />
        <HistogramAxis bins={bins} />
        <div />
      </div>

      {separationSd !== null && (
        <div className="explorer-group-row">
          <div />
          <div className="explorer-group-separation">
            Means differ by {separationSd.toFixed(2)}σ
          </div>
          <div />
        </div>
      )}
    </div>
  );
};
