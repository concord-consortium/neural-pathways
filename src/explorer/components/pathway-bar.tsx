import React from "react";
import { FillBar } from "./fill-bar";
import "./pathway-bar.scss";

interface PathwayBarProps {
  index: number;
  score: number;
  scaleExtent: [number, number];
  varianceFraction?: number;
  showExtents: boolean;
  explainedVariance?: number;
  pathwayImportance?: number;
  importancePercent?: number;
  maxImportance?: number;
  onClick?: (index: number) => void;
  selected?: boolean;
}

function roundExtent(value: number): string {
  const abs = Math.abs(value);
  const precision = abs >= 1 ? 1 : abs >= 0.1 ? 2 : 3;
  return value.toFixed(precision);
}

export const PathwayBar: React.FC<PathwayBarProps> = ({
  index, score, scaleExtent, varianceFraction, showExtents,
  explainedVariance, pathwayImportance, importancePercent, maxImportance,
  onClick, selected
}) => {
  const [min, max] = scaleExtent;
  const range = Math.max(Math.abs(min), Math.abs(max));
  const widthPercent = range > 0 ? (Math.abs(score) / range) * 50 : 0;
  const clampedWidth = Math.min(widthPercent, 50);
  const isPositive = score >= 0;

  const hasImportance = pathwayImportance != null && importancePercent != null
    && maxImportance != null && maxImportance > 0;
  const impWidthPercent = hasImportance
    ? Math.min((Math.abs(pathwayImportance!) / maxImportance!) * 50, 50)
    : 0;
  const impIsPositive = (pathwayImportance ?? 0) >= 0;

  return (
    <div
      className={`pathway-bar-row${selected ? " pathway-bar-selected" : ""}`}
      data-testid={`pathway-bar-row-${index}`}
      onClick={() => onClick?.(index)}
    >
      <div className="pathway-bar-columns">
        {/* Left column: per-review data */}
        <div className="pathway-bar-col pathway-bar-col-review">
          <div className="pathway-bar-header">
            <span>Pathway {index}</span>
          </div>
          <div className="pathway-bar-row-with-value">
            <div className="pathway-bar-track">
              {showExtents && (
                <span className="pathway-bar-extent">{roundExtent(min)}</span>
              )}
              <div className="pathway-bar-container">
                <div className="pathway-bar-center" />
                <div
                  className={`pathway-bar-fill ${isPositive ? "positive" : "negative"}`}
                  data-testid={`pathway-bar-fill-${index}`}
                  style={isPositive
                    ? { left: "50%", width: `${clampedWidth}%` }
                    : { right: "50%", width: `${clampedWidth}%` }
                  }
                />
              </div>
              {showExtents && (
                <span className="pathway-bar-extent">{roundExtent(max)}</span>
              )}
            </div>
            <span className="pathway-bar-value">{score.toFixed(3)}</span>
          </div>
          {varianceFraction != null && (
            <FillBar
              value={varianceFraction}
              maxValue={1}
              label={`${(varianceFraction * 100).toFixed(1)}%`}
              className="fill-bar-review"
              testId={`variance-fill-${index}`}
            />
          )}
        </div>
        {/* Right column: per-fit data */}
        <div className="pathway-bar-col pathway-bar-col-fit">
          {explainedVariance != null && (
            <FillBar
              value={explainedVariance}
              maxValue={1}
              label={`${(explainedVariance * 100).toFixed(1)}%`}
              className="fill-bar-fit"
              testId={`ev-fill-${index}`}
            />
          )}
          {hasImportance && (
            <div className="pathway-bar-row-with-value">
              <div className="pathway-bar-container importance-bar-container">
                <div className="pathway-bar-center" />
                <div
                  className={`pathway-bar-fill ${impIsPositive ? "imp-positive" : "imp-negative"}`}
                  data-testid={`imp-fill-${index}`}
                  style={impIsPositive
                    ? { left: "50%", width: `${impWidthPercent}%` }
                    : { right: "50%", width: `${impWidthPercent}%` }
                  }
                />
              </div>
              <span className="pathway-bar-value">
                {pathwayImportance!.toFixed(2)}
              </span>
            </div>
          )}
          {importancePercent != null && (
            <FillBar
              value={importancePercent}
              maxValue={100}
              label={`${importancePercent.toFixed(1)}%`}
              className="fill-bar-fit"
              testId={`imp-pct-fill-${index}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
