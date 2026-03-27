import React, { useState, useMemo, useCallback } from "react";
import { VizData } from "../types/viz-data";
import { computeAbsMax } from "../utils/color-scale";
import { computeScoredPathway, computeSum } from "../utils/reconstruction";
import { ReviewPanel } from "./review-panel";
import { PathwayGrid } from "./pathway-grid";
import { ColorLegend } from "./color-legend";
import { Heatmap } from "./heatmap";
import vizData from "../../viz_data.json";

import "./app.scss";

const data = vizData as VizData;

export const App = () => {
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [scoreOverrides, setScoreOverrides] = useState<Record<number, number>>({});
  const [overridesForReview, setOverridesForReview] = useState(0);

  const review = data.reviews[selectedReviewIndex];

  if (overridesForReview !== selectedReviewIndex) {
    setScoreOverrides({});
    setOverridesForReview(selectedReviewIndex);
  }

  const pathwayScores = useMemo(() =>
    review.pathway_scores.map((original, i) =>
      i in scoreOverrides ? scoreOverrides[i] : original
    ),
    [review, scoreOverrides]
  );

  const handleScoreChange = useCallback((pathwayIndex: number, value: number) => {
    setScoreOverrides(prev => ({ ...prev, [pathwayIndex]: value }));
  }, []);

  const scoredPathways = useMemo(() =>
    data.pathways.components.map((comp, i) => computeScoredPathway(comp, pathwayScores[i])),
    [pathwayScores]
  );

  const sumActivations = useMemo(() =>
    computeSum(data.pathways.mean, scoredPathways),
    [scoredPathways]
  );

  const absMax = useMemo(() => {
    const allArrays = [
      ...data.pathways.components,
      ...scoredPathways,
      sumActivations,
      review.activations_standardized,
    ];
    return computeAbsMax(...allArrays);
  }, [scoredPathways, sumActivations, review]);

  return (
    <div className="app">
      {/* Row 1, Col 1: Review info */}
      <ReviewPanel
        reviews={data.reviews}
        selectedIndex={selectedReviewIndex}
        onSelectReview={setSelectedReviewIndex}
      />
      {/* Row 1, Col 2: Pathway grid */}
      <div className="pathway-grid-container">
        <ColorLegend absMax={absMax} />
        <PathwayGrid
          components={data.pathways.components}
          pathwayScores={pathwayScores}
          originalScores={review.pathway_scores}
          scoredPathways={scoredPathways}
          absMax={absMax}
          onScoreChange={handleScoreChange}
        />
        <div className="comparison-equals">=</div>
      </div>
      {/* Row 2, Col 1: Original activations */}
      <div className="comparison-original">
        <div className="comparison-section-label">Original Activations</div>
        <Heatmap data={review.activations_standardized} absMax={absMax} />
      </div>
      {/* Row 2, Col 2: Sum */}
      <div className="comparison-result">
        <div className="comparison-section-label">Sum</div>
        <Heatmap data={sumActivations} absMax={absMax} />
      </div>
    </div>
  );
};
