import React from "react";
import "./pathway-bar.scss";

interface PathwayBarProps {
  index: number;
  score: number;
  scaleExtent: [number, number];
  varianceFraction?: number;
  showScore: boolean;
  showExtents: boolean;
  onClick?: (index: number) => void;
  selected?: boolean;
}

function roundExtent(value: number): string {
  const abs = Math.abs(value);
  const precision = abs >= 1 ? 1 : abs >= 0.1 ? 2 : 3;
  return value.toFixed(precision);
}

export const PathwayBar: React.FC<PathwayBarProps> = ({
  index, score, scaleExtent, varianceFraction, showScore, showExtents, onClick, selected
}) => {
  const [min, max] = scaleExtent;
  const range = Math.max(Math.abs(min), Math.abs(max));
  const widthPercent = range > 0 ? (Math.abs(score) / range) * 50 : 0;
  const clampedWidth = Math.min(widthPercent, 50);
  const isPositive = score >= 0;

  return (
    <div
      className={`pathway-bar-row${selected ? " pathway-bar-selected" : ""}`}
      data-testid={`pathway-bar-row-${index}`}
      onClick={() => onClick?.(index)}
    >
      <div className="pathway-bar-label">
        <span>Pathway {index}</span>
        <span className="pathway-bar-meta">
          {showScore && (
            <span className="pathway-bar-score">{score.toFixed(3)}</span>
          )}
          {varianceFraction != null && (
            <span className="pathway-bar-variance">
              {(varianceFraction * 100).toFixed(1)}%
            </span>
          )}
        </span>
      </div>
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
    </div>
  );
};
