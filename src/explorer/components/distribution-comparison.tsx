import React from "react";
import { GroupComparison } from "../utils/statistics";
import { barTitle } from "../utils/axis";
import { HistogramAxis } from "./histogram-axis";
import { HistogramBars } from "./histogram-bars";
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

  return (
    <div className="explorer-distribution-comparison" data-testid="distribution-comparison">
      {/* One HistogramBars per group, so each group is scaled against its own
          peak — the reasoning lives on that component. */}
      {groups.map(group => (
        <div className="explorer-group-row" key={group.value} data-testid={`group-row-${group.value}`}>
          <div className="explorer-group-label">
            {groupLabels[group.value] ?? String(group.value)}
          </div>
          <HistogramBars
            counts={group.counts}
            height={BAR_AREA_HEIGHT}
            className="explorer-group-histogram"
            barClassName="explorer-group-bar"
            barTestId="group-bar"
            hit={{
              className: "explorer-group-hit",
              testId: "group-bar-hit",
              title: (i, count) => barTitle(bins, i, count, scoreLabel, itemNoun.plural),
            }}
            ariaLabel={`Distribution for group ${groupLabels[group.value] ?? group.value}`}
          />
          <div className="explorer-group-stats">
            n = {group.n} · mean {group.mean.toFixed(2)}
          </div>
        </div>
      ))}

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
