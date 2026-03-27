import React, { useState, useMemo, useCallback } from "react";
import { VizData } from "../types/viz-data";
import { ScaleType, computeAbsMax } from "../utils/color-scale";
import { computeScoredPathway, computeSum } from "../utils/reconstruction";
import { ReviewPanel } from "./review-panel";
import { PathwayGrid } from "./pathway-grid";
import { ScoredPathwaysView } from "./scored-pathways-view";
import { ColorLegend } from "./color-legend";
import { Heatmap } from "./heatmap";
import vizData from "../../viz_data.json";

import "./app.scss";

const data = vizData as VizData;

const scaleOptions: { value: ScaleType; label: string }[] = [
  { value: "blue-white-red", label: "Fixed size: blue → white → red" },
  { value: "blue-gray-red", label: "Fixed size: blue → gray → red" },
  { value: "size-based", label: "Size based on value" },
];

export const App = () => {
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [scoreOverrides, setScoreOverrides] = useState<Record<number, number>>({});
  const [overridesForReview, setOverridesForReview] = useState(0);
  const [scaleType, setScaleType] = useState<ScaleType>("blue-white-red");
  const [showStats, setShowStats] = useState(false);

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
        <div className="toolbar">
          <ColorLegend absMax={absMax} scaleType={scaleType} showStats={showStats} />
          <select
            className="scale-selector"
            value={scaleType}
            onChange={e => setScaleType(e.target.value as ScaleType)}
          >
            {scaleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="stats-toggle">
            <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} />
            Show stats
          </label>
        </div>
        <PathwayGrid
          components={data.pathways.components}
          pathwayScores={pathwayScores}
          originalScores={review.pathway_scores}
          absMax={absMax}
          scaleType={scaleType}
          showStats={showStats}
          onScoreChange={handleScoreChange}
        />
        <ScoredPathwaysView
          scoredPathways={scoredPathways}
          absMax={absMax}
          scaleType={scaleType}
          showStats={showStats}
        />
        <div className="comparison-equals">=</div>
      </div>
      {/* Row 2, Col 1: Original activations */}
      <div className="comparison-original">
        <div className="comparison-section-label">Original Activations</div>
        <Heatmap data={review.activations_standardized} absMax={absMax} scaleType={scaleType} showStats={showStats} />
      </div>
      {/* Row 2, Col 2: Sum */}
      <div className="comparison-result">
        <div className="comparison-section-label">Sum</div>
        <Heatmap data={sumActivations} absMax={absMax} scaleType={scaleType} showStats={showStats} />
      </div>
    </div>
  );
};
