import React from "react";
import "./pathway-bar.scss";

interface PathwayBarProps {
  index: number;
  score: number;
  scaleExtent: [number, number];
  varianceFraction?: number;
}

export const PathwayBar: React.FC<PathwayBarProps> = ({
  index, score, scaleExtent, varianceFraction
}) => {
  const [min, max] = scaleExtent;
  const range = Math.max(Math.abs(min), Math.abs(max));
  const widthPercent = range > 0 ? (Math.abs(score) / range) * 50 : 0;
  const clampedWidth = Math.min(widthPercent, 50);
  const isPositive = score >= 0;

  return (
    <div className="pathway-bar-row">
      <div className="pathway-bar-label">
        <span>Pathway {index}</span>
        {varianceFraction != null && (
          <span className="pathway-bar-variance">
            {(varianceFraction * 100).toFixed(1)}%
          </span>
        )}
      </div>
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
      <div className="pathway-bar-score">{score.toFixed(3)}</div>
    </div>
  );
};
