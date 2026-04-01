import React, { useState, useMemo, useCallback } from "react";
import { VizData } from "../types/viz-data";
import { ScaleType, ValueScaling, computeAbsMax } from "../../shared/color-scale";
import { computeScoredPathway, computeSum } from "../utils/reconstruction";
import { ReviewPanel } from "./review-panel";
import { PathwayPatterns, PathwayScoresRow } from "./pathway-grid";
import { ScoredPathwaysView } from "./scored-pathways-view";
import { ColorLegend } from "./color-legend";
import { Heatmap } from "./heatmap";
import vizData from "../../../viz_data.json";

import "./app.scss";

const data = vizData as VizData;

const scaleOptions: { value: ScaleType; label: string }[] = [
  { value: "blue-white-red", label: "Fixed size: blue → white → red" },
  { value: "blue-gray-red", label: "Fixed size: blue → gray → red" },
  { value: "multi-hue", label: "Multi-hue: blue → cyan → white → yellow → red" },
  { value: "size-based", label: "Size based on value" },
];

const scalingOptions: { value: ValueScaling; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "exponential", label: "Exponential" },
  { value: "logarithmic", label: "Logarithmic" },
];

type ScaleMode = "same-across-reviews" | "current-review" | "multiple-scales";

const scaleModeOptions: { value: ScaleMode; label: string }[] = [
  { value: "current-review", label: "Current review" },
  { value: "same-across-reviews", label: "Same across reviews" },
  { value: "multiple-scales", label: "Multiple scales" },
];

export const App = () => {
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0);
  const [scoreOverrides, setScoreOverrides] = useState<Record<number, number>>({});
  const [overridesForReview, setOverridesForReview] = useState(0);
  const [scaleType, setScaleType] = useState<ScaleType>("blue-white-red");
  const [valueScaling, setValueScaling] = useState<ValueScaling>("linear");
  const [showStats, setShowStats] = useState(false);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("current-review");

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

  const noise = useMemo(() =>
    review.activations_standardized.map((v, i) => v - sumActivations[i]),
    [review, sumActivations]
  );

  const globalAbsMax = useMemo(() =>
    computeAbsMax(...data.reviews.map(r => r.activations_standardized)),
    []
  );

  const patternsAbsMax = useMemo(() =>
    computeAbsMax(...data.pathways.components),
    []
  );

  const perReviewAbsMax = useMemo(() => {
    const allArrays = [
      ...data.pathways.components,
      ...scoredPathways,
      sumActivations,
      review.activations_standardized,
      noise,
    ];
    return computeAbsMax(...allArrays);
  }, [scoredPathways, sumActivations, review, noise]);

  const scoredAbsMax = useMemo(() =>
    computeAbsMax(...scoredPathways),
    [scoredPathways]
  );

  const activationsAbsMax = useMemo(() =>
    computeAbsMax(review.activations_standardized, sumActivations, noise),
    [review, sumActivations, noise]
  );

  // absMax for review-specific content (used in current-review and same-across-reviews)
  const absMax = scaleMode === "same-across-reviews"
    ? globalAbsMax : perReviewAbsMax;

  // Per-section scales for multiple-scales mode
  const patternsScale = scaleMode === "multiple-scales"
    ? patternsAbsMax : absMax;
  const scoredScale = scaleMode === "multiple-scales"
    ? scoredAbsMax : absMax;
  const activationsScale = scaleMode === "multiple-scales"
    ? activationsAbsMax : absMax;

  const colorLegendProps = { scaleType, valueScaling, showStats };

  return (
    <div className="app">
      {/* Row 1: Toolbar spanning both columns */}
      <div className="toolbar">
        <select
          className="scale-selector"
          value={scaleType}
          onChange={e => setScaleType(e.target.value as ScaleType)}
        >
          {scaleOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="scale-selector"
          value={valueScaling}
          onChange={e => setValueScaling(e.target.value as ValueScaling)}
        >
          {scalingOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="scale-mode-label">Scale:</label>
        <select
          className="scale-selector"
          value={scaleMode}
          onChange={e => setScaleMode(e.target.value as ScaleMode)}
        >
          {scaleModeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="stats-toggle">
          <input type="checkbox" checked={showStats}
            onChange={e => setShowStats(e.target.checked)} />
          Show stats
        </label>
      </div>

      {/* Row 2, Col 1: Color legend when same across reviews */}
      <div className="color-legend-cell">
        {scaleMode === "same-across-reviews" && (
          <ColorLegend absMax={absMax} {...colorLegendProps} />
        )}
      </div>
      {/* Row 2, Col 2: Pathway patterns */}
      <div className="pathway-patterns-container">
        <PathwayPatterns
          components={data.pathways.components}
          absMax={patternsScale}
          scaleType={scaleType}
          valueScaling={valueScaling}
          showStats={showStats}
          legend={scaleMode === "multiple-scales"
            ? <ColorLegend absMax={patternsScale} {...colorLegendProps} />
            : undefined}
        />
      </div>

      <div className="row-divider" />

      {/* Row 3, Col 1: Review info */}
      <ReviewPanel
        reviews={data.reviews}
        selectedIndex={selectedReviewIndex}
        onSelectReview={setSelectedReviewIndex}
      >
        {scaleMode !== "same-across-reviews" && (
          <ColorLegend absMax={activationsScale} {...colorLegendProps} />
        )}
      </ReviewPanel>
      {/* Row 3, Col 2: Scores + Scored pathways */}
      <div className="pathway-grid-container">
        <PathwayScoresRow
          pathwayScores={pathwayScores}
          originalScores={review.pathway_scores}
          onScoreChange={handleScoreChange}
        />
        <ScoredPathwaysView
          scoredPathways={scoredPathways}
          absMax={scoredScale}
          scaleType={scaleType}
          valueScaling={valueScaling}
          showStats={showStats}
          legend={scaleMode === "multiple-scales"
            ? <ColorLegend absMax={scoredScale} {...colorLegendProps} />
            : undefined}
        />
        <div className="comparison-equals">=</div>
      </div>

      {/* Row 4, Col 1: Original activations */}
      <div className="comparison-original">
        <div className="comparison-section-label">Original Activations</div>
        <Heatmap
          data={review.activations_standardized} absMax={activationsScale}
          scaleType={scaleType} valueScaling={valueScaling}
          showStats={showStats}
        />
      </div>
      {/* Row 4, Col 2: Sum + Noise */}
      <div className="comparison-result">
        <div className="comparison-result-item">
          <div className="comparison-section-label">Sum</div>
          <Heatmap
            data={sumActivations} absMax={activationsScale}
            scaleType={scaleType} valueScaling={valueScaling}
            showStats={showStats}
          />
        </div>
        <div className="comparison-result-item">
          <div className="comparison-section-label">Noise</div>
          <Heatmap
            data={noise} absMax={activationsScale}
            scaleType={scaleType} valueScaling={valueScaling}
            showStats={showStats}
          />
        </div>
        {showStats && review.reconstruction_r2 != null && (
          <div className="comparison-result-item comparison-r2">
            <div className="comparison-section-label">R²</div>
            <div className="r2-value">
              {(review.reconstruction_r2 * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
