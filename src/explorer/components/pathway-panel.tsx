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
}

export const PathwayPanel: React.FC<PathwayPanelProps> = ({
  scores, varianceFractions, scaleMode, scaleExtents, showVarianceFractions
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
          />
        );
      })}
    </div>
  );
};
