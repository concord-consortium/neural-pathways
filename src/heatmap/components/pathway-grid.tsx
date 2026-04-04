import React from "react";
import { Heatmap } from "./heatmap";
import { PathwayScoreInput } from "./pathway-score-input";
import { ScaleType, ValueScaling } from "../../shared/color-scale";
import { TerminologyMode, getLabel, getPathwayHeader } from "../utils/terminology";
import "./pathway-grid.scss";

function pathwayColumnTemplate(nPathways: number, extraColumns = 0): string {
  const totalItems = nPathways + extraColumns;
  const nColumns = 2 * totalItems - 1;
  return Array.from({ length: nColumns }, (_, i) => {
    if (i % 2 === 0) return "1fr";
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
  explainedVariance?: number[];
  noiseVariance?: number[];
  terminologyMode: TerminologyMode;
}

export const PathwayPatterns: React.FC<PathwayPatternsProps> = ({
  components, absMax, scaleType, valueScaling, showStats, legend, explainedVariance,
  noiseVariance, terminologyMode,
}) => {
  const nPathways = components.length;
  const hasNoise = noiseVariance != null;
  const columnTemplate = pathwayColumnTemplate(nPathways, hasNoise ? 1 : 0);

  return (
    <div className="pathway-grid" style={{ gridTemplateColumns: columnTemplate }}>
      {/* Header row */}
      {Array.from({ length: nPathways }, (_, i) => (
        <React.Fragment key={`h-${i}`}>
          <div className="pathway-grid-header">
            {getPathwayHeader(i, terminologyMode)}
            {explainedVariance && (
              <span className="pathway-grid-ev">
                {" "}({(explainedVariance[i] * 100).toFixed(0)}% EV)
              </span>
            )}
          </div>
          {i < nPathways - 1 && <div className="pathway-grid-empty" />}
        </React.Fragment>
      ))}
      {hasNoise && (
        <>
          <div className="pathway-grid-empty" />
          <div className="pathway-grid-header">Noise Variance</div>
        </>
      )}

      {/* Row label: Unscored */}
      <div className="pathway-grid-row-label">
        {getLabel("pathwayLoadings", terminologyMode)}
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
      {hasNoise && (
        <>
          <div className="pathway-grid-empty" />
          <Heatmap
            data={noiseVariance} absMax={1} scaleType={scaleType}
            valueScaling={valueScaling} showStats={showStats}
          />
        </>
      )}
    </div>
  );
};

interface PathwayScoresRowProps {
  pathwayScores: number[];
  originalScores: number[];
  onScoreChange: (pathwayIndex: number, value: number) => void;
  terminologyMode: TerminologyMode;
  extraColumns?: number;
}

export const PathwayScoresRow: React.FC<PathwayScoresRowProps> = ({
  pathwayScores, originalScores, onScoreChange, terminologyMode, extraColumns = 0
}) => {
  const nPathways = pathwayScores.length;
  const columnTemplate = pathwayColumnTemplate(nPathways, extraColumns);

  return (
    <div className="pathway-grid" style={{ gridTemplateColumns: columnTemplate }}>
      {/* Row label: Scores */}
      <div className="pathway-grid-row-label">{getLabel("pathwayScoresForReview", terminologyMode)}</div>

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
