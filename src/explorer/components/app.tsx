// src/explorer/components/app.tsx
import React, { useState, useMemo } from "react";
import { ExplorerData, ExplorerReview, ScaleMode, ScaleExtents } from "../types/explorer-data";
import { ReviewSelector } from "./review-selector";
import { ReviewPanel } from "./review-panel";
import { PathwayPanel } from "./pathway-panel";
import { SettingsMenu } from "./settings-menu";
import explorerData from "../explorer_data.json";

import "./app.scss";

const data = explorerData as ExplorerData;

export const App = () => {
  const [selectedReview, setSelectedReview] = useState<ExplorerReview | null>(null);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("shared");
  const [showVarianceFractions, setShowVarianceFractions] = useState(false);

  const scaleExtents = useMemo<ScaleExtents>(() => {
    let globalMin = Infinity;
    let globalMax = -Infinity;
    const nPathways = data.metadata.n_pathways;
    const perPathwayMins = new Array(nPathways).fill(Infinity);
    const perPathwayMaxs = new Array(nPathways).fill(-Infinity);

    for (const review of data.reviews) {
      for (let i = 0; i < nPathways; i++) {
        const score = review.pathway_scores[i];
        if (score < globalMin) globalMin = score;
        if (score > globalMax) globalMax = score;
        if (score < perPathwayMins[i]) perPathwayMins[i] = score;
        if (score > perPathwayMaxs[i]) perPathwayMaxs[i] = score;
      }
    }

    return {
      shared: [globalMin, globalMax],
      perPathway: perPathwayMins.map((min, i) => [min, perPathwayMaxs[i]]),
    };
  }, []);

  return (
    <div className="explorer-app">
      <h1 className="explorer-title">Pathway Explorer</h1>

      <div className="explorer-top-bar">
        <ReviewSelector reviews={data.reviews} onSelect={setSelectedReview} />
        <SettingsMenu
          scaleMode={scaleMode}
          onScaleModeChange={setScaleMode}
          showVarianceFractions={showVarianceFractions}
          onShowVarianceFractionsChange={setShowVarianceFractions}
        />
      </div>

      {selectedReview ? (
        <div className="explorer-main">
          <ReviewPanel review={selectedReview} />
          <PathwayPanel
            scores={selectedReview.pathway_scores}
            varianceFractions={selectedReview.pathway_variance_fractions}
            scaleMode={scaleMode}
            scaleExtents={scaleExtents}
            showVarianceFractions={showVarianceFractions}
          />
        </div>
      ) : (
        <div className="explorer-empty">
          Select a review above to see its pathway scores.
        </div>
      )}
    </div>
  );
};
