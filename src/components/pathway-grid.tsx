import React from "react";
import { Heatmap } from "./heatmap";
import { PathwayScoreInput } from "./pathway-score-input";
import { ScaleType, ValueScaling } from "../utils/color-scale";
import "./pathway-grid.scss";

function pathwayColumnTemplate(nPathways: number): string {
  const nColumns = 2 * nPathways - 1;
  return Array.from({ length: nColumns }, (_, i) => {
    if (i % 2 === 0) return "auto";
    return "20px";
  }).join(" ");
}

interface PathwayPatternsProps {
  components: number[][];
  absMax: number;
  scaleType: ScaleType;
  valueScaling: ValueScaling;
  showStats: boolean;
  legend?: React.ReactNode;
}

export const PathwayPatterns: React.FC<PathwayPatternsProps> = ({
  components, absMax, scaleType, valueScaling, showStats, legend
}) => {
  const nPathways = components.length;
  const columnTemplate = pathwayColumnTemplate(nPathways);

  return (
    <div className="pathway-grid" style={{ gridTemplateColumns: columnTemplate }}>
      {/* Header row */}
      {Array.from({ length: nPathways }, (_, i) => (
        <React.Fragment key={`h-${i}`}>
          <div className="pathway-grid-header">P{i + 1}</div>
          {i < nPathways - 1 && <div className="pathway-grid-empty" />}
        </React.Fragment>
      ))}

      {/* Row label: Unscored */}
      <div className="pathway-grid-row-label">
        Pathway patterns (unscored)
        {legend && <span className="pathway-grid-legend">{legend}</span>}
      </div>

      {/* Unscored heatmaps row */}
      {components.map((comp, i) => (
        <React.Fragment key={`unscored-${i}`}>
          <Heatmap
            data={comp} absMax={absMax} scaleType={scaleType}
            valueScaling={valueScaling} showStats={showStats}
          />
          {i < nPathways - 1 && <div className="pathway-grid-empty" />}
        </React.Fragment>
      ))}
    </div>
  );
};

interface PathwayScoresRowProps {
  pathwayScores: number[];
  originalScores: number[];
  onScoreChange: (pathwayIndex: number, value: number) => void;
}

export const PathwayScoresRow: React.FC<PathwayScoresRowProps> = ({
  pathwayScores, originalScores, onScoreChange
}) => {
  const nPathways = pathwayScores.length;
  const columnTemplate = pathwayColumnTemplate(nPathways);

  return (
    <div className="pathway-grid" style={{ gridTemplateColumns: columnTemplate }}>
      {/* Row label: Scores */}
      <div className="pathway-grid-row-label">Pathway scores for this review</div>

      {/* Scores row */}
      {pathwayScores.map((score, i) => (
        <React.Fragment key={`score-${i}`}>
          <PathwayScoreInput
            value={score}
            originalValue={originalScores[i]}
            onChange={v => onScoreChange(i, v)}
          />
          {i < nPathways - 1 && <div className="pathway-grid-empty" />}
        </React.Fragment>
      ))}
    </div>
  );
};
