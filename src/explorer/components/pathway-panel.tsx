import React from "react";
import { ScaleMode, ScaleExtents } from "../types/explorer-data";
import { PathwayBar } from "./pathway-bar";
import "./pathway-panel.scss";

interface PathwayPanelProps {
  scores: number[];
  varianceFractions?: number[];
  scaleMode: ScaleMode;
  scaleExtents: ScaleExtents;
  showVarianceFractions: boolean;
  showExtents: boolean;
  explainedVariancePerPathway?: number[];
  pathwayImportance?: number[];
  onPathwayClick?: (index: number) => void;
  selectedPathways?: Set<number>;
}

function computeImportancePercents(importance: number[]): number[] {
  const totalAbs = importance.reduce((sum, v) => sum + Math.abs(v), 0);
  if (totalAbs === 0) return importance.map(() => 0);
  return importance.map(v => (Math.abs(v) / totalAbs) * 100);
}

export const PathwayPanel: React.FC<PathwayPanelProps> = ({
  scores, varianceFractions, scaleMode, scaleExtents, showVarianceFractions,
  showExtents, explainedVariancePerPathway, pathwayImportance,
  onPathwayClick, selectedPathways
}) => {
  const importancePercents = pathwayImportance ? computeImportancePercents(pathwayImportance) : undefined;
  const maxImportance = pathwayImportance
    ? Math.max(...pathwayImportance.map(Math.abs))
    : undefined;

  return (
    <div className="pathway-panel">
      <div className="pathway-panel-legend" data-testid="pathway-panel-legend">
        <div className="pathway-panel-legend-header">Pathways</div>
        <div className="pathway-panel-legend-columns">
          <div className="pathway-panel-legend-col">
            <span className="legend-title">This Review</span>
            <span className="legend-item">Score</span>
            {showVarianceFractions && <span className="legend-item">Var. Fraction</span>}
          </div>
          <div className="pathway-panel-legend-col">
            <span className="legend-title">Fit Properties</span>
            <span className="legend-item">Expl. Variance</span>
            <span className="legend-item">Importance</span>
            <span className="legend-item">Importance %</span>
          </div>
        </div>
      </div>
      {scores.map((score, i) => {
        const extent = scaleMode === "shared"
          ? scaleExtents.shared
          : scaleExtents.perPathway[i];
        return (
          <PathwayBar
            key={i}
            index={i}
            score={score}
            scaleExtent={extent}
            varianceFraction={showVarianceFractions ? varianceFractions?.[i] : undefined}
            showExtents={showExtents}
            explainedVariance={explainedVariancePerPathway?.[i]}
            pathwayImportance={pathwayImportance?.[i]}
            importancePercent={importancePercents?.[i]}
            maxImportance={maxImportance}
            onClick={onPathwayClick}
            selected={selectedPathways?.has(i)}
          />
        );
      })}
    </div>
  );
};
