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
  showScores: boolean;
  showExtents: boolean;
  onPathwayClick?: (index: number) => void;
  selectedPathways?: Set<number>;
}

export const PathwayPanel: React.FC<PathwayPanelProps> = ({
  scores, varianceFractions, scaleMode, scaleExtents, showVarianceFractions,
  showScores, showExtents, onPathwayClick, selectedPathways
}) => {
  return (
    <div className="pathway-panel">
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
            showScore={showScores}
            showExtents={showExtents}
            onClick={onPathwayClick}
            selected={selectedPathways?.has(i)}
          />
        );
      })}
    </div>
  );
};
