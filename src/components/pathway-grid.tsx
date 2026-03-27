import React from "react";
import { Heatmap } from "./heatmap";
import { PathwayScoreInput } from "./pathway-score-input";
import { ScaleType, ValueScaling } from "../utils/color-scale";
import "./pathway-grid.scss";

interface PathwayGridProps {
  components: number[][];
  pathwayScores: number[];
  originalScores: number[];
  absMax: number;
  scaleType: ScaleType;
  valueScaling: ValueScaling;
  showStats: boolean;
  onScoreChange: (pathwayIndex: number, value: number) => void;
}

export const PathwayGrid: React.FC<PathwayGridProps> = ({
  components, pathwayScores, originalScores,
  absMax, scaleType, valueScaling, showStats, onScoreChange
}) => {
  const nPathways = components.length;
  // Columns: P1, +, P2, +, ..., +, P6
  // nPathways heatmap cols + (nPathways - 1) operator cols = 2*nPathways - 1
  const nColumns = 2 * nPathways - 1;

  const columnTemplate = Array.from({ length: nColumns }, (_, i) => {
    if (i % 2 === 0) return "auto"; // heatmap column
    return "20px";                  // operator column (+)
  }).join(" ");

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
      <div className="pathway-grid-row-label">Pathway patterns (unscored)</div>

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
