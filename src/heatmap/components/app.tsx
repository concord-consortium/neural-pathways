import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { S3Index, S3Review, ActivationBucket } from "../types/viz-data";
import { ScaleType, ValueScaling, computeAbsMax } from "../../shared/color-scale";
import { computeScoredPathway, computeSum } from "../utils/reconstruction";
import {
  fetchIndex, fetchActivations, fitToPathways, fitToScaler, fitToMetadata,
  standardizeActivations,
} from "../utils/data-loader";
import { ReviewPanel } from "./review-panel";
import { PathwayPatterns, PathwayScoresRow } from "./pathway-grid";
import { ScoredPathwaysView } from "./scored-pathways-view";
import { ColorLegend } from "./color-legend";
import { Heatmap } from "./heatmap";
import { TerminologyMode, getLabel } from "../utils/terminology";

import "./app.scss";

function getHashParams(): Record<string, string> {
  const hash = window.location.hash.slice(1);
  const params: Record<string, string> = {};
  for (const part of hash.split("&")) {
    const [key, value] = part.split("=");
    if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return params;
}

function updateHash(reviewId: string | null, fitName: string) {
  const parts: string[] = [];
  if (reviewId) parts.push(`review=${encodeURIComponent(reviewId)}`);
  if (fitName) parts.push(`fit=${encodeURIComponent(fitName)}`);
  const newHash = parts.length > 0 ? `#${parts.join("&")}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname);
  }
}

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

type ScaleMode = "current-review" | "multiple-scales";

const scaleModeOptions: { value: ScaleMode; label: string }[] = [
  { value: "current-review", label: "Current review" },
  { value: "multiple-scales", label: "Multiple scales" },
];

export const App = () => {
  // --- Data loading state ---
  const [indexData, setIndexData] = useState<S3Index | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFitName, setSelectedFitName] = useState<string>("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const activationCacheRef = useRef<Map<string, ActivationBucket>>(new Map());
  const [rawActivations, setRawActivations] = useState<number[] | null>(null);
  const [activationsLoading, setActivationsLoading] = useState(false);

  // --- UI state ---
  const [scoreOverrides, setScoreOverrides] = useState<Record<number, number>>({});
  const [scaleType, setScaleType] = useState<ScaleType>("multi-hue");
  const [valueScaling, setValueScaling] = useState<ValueScaling>("logarithmic");
  const [showStats, setShowStats] = useState(true);
  const [showScaler, setShowScaler] = useState(false);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("multiple-scales");
  const [terminologyMode, setTerminologyMode] = useState<TerminologyMode>("project");

  // --- Fetch index on mount ---
  useEffect(() => {
    fetchIndex()
      .then(data => {
        setIndexData(data);
        const hashParams = getHashParams();
        const names = Object.keys(data.metadata.fa_fits);
        const fitName = hashParams.fit && names.includes(hashParams.fit)
          ? hashParams.fit : names[0];
        setSelectedFitName(fitName);
        if (data.reviews.length > 0) {
          const reviewId = hashParams.review && data.reviews.some(r => r.id === hashParams.review)
            ? hashParams.review : data.reviews[0].id;
          setSelectedReviewId(reviewId);
          setActivationsLoading(true);
        }
      })
      .catch(err => setLoadError(err.message));
  }, []);

  // --- Fetch activations when review changes ---
  const [activationReviewId, setActivationReviewId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedReviewId) return;
    let cancelled = false;
    fetchActivations(selectedReviewId, activationCacheRef.current)
      .then(activations => {
        if (!cancelled) {
          setRawActivations(activations);
          setActivationReviewId(selectedReviewId);
          setActivationsLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Failed to fetch activations:", err);
          setActivationsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [selectedReviewId]);

  // Treat activations as null if they don't match the current review
  const currentRawActivations = activationReviewId === selectedReviewId ? rawActivations : null;

  // --- Derived data from selected fit ---
  const selectedFit = indexData?.metadata.fa_fits[selectedFitName] ?? null;

  const pathways = useMemo(
    () => selectedFit ? fitToPathways(selectedFit) : null,
    [selectedFit],
  );

  const scaler = useMemo(
    () => selectedFit ? fitToScaler(selectedFit) : null,
    [selectedFit],
  );

  const metadata = useMemo(
    () => selectedFit ? fitToMetadata(selectedFit) : null,
    [selectedFit],
  );

  // --- Selected review ---
  const selectedReview = useMemo(
    () => indexData?.reviews.find(r => r.id === selectedReviewId),
    [indexData, selectedReviewId],
  );

  const pathwayScoresFromIndex = useMemo(
    () => selectedReview?.pathway_scores[selectedFitName] ?? [],
    [selectedReview, selectedFitName],
  );

  const reviewR2 = selectedReview?.reconstruction_r2[selectedFitName] ?? null;

  // --- Score overrides (keyed on review + fit, auto-resets when either changes) ---
  const [scoreOverrideKey, setScoreOverrideKey] = useState("");
  const currentOverrideKey = `${selectedReviewId}:${selectedFitName}`;
  const effectiveOverrides = useMemo(
    () => scoreOverrideKey === currentOverrideKey ? scoreOverrides : {},
    [scoreOverrideKey, currentOverrideKey, scoreOverrides],
  );

  const pathwayScores = useMemo(() =>
    pathwayScoresFromIndex.map((original, i) =>
      i in effectiveOverrides ? effectiveOverrides[i] : original
    ),
    [pathwayScoresFromIndex, effectiveOverrides],
  );

  const handleScoreChange = useCallback((pathwayIndex: number, value: number) => {
    setScoreOverrideKey(currentOverrideKey);
    setScoreOverrides(prev => ({ ...prev, [pathwayIndex]: value }));
  }, [currentOverrideKey]);

  // --- Review selection handler ---
  const handleSelectReview = useCallback((review: S3Review) => {
    setSelectedReviewId(review.id);
    setActivationsLoading(true);
  }, []);

  // --- FA fit change handler ---
  const handleFitChange = useCallback((fitName: string) => {
    setSelectedFitName(fitName);
  }, []);

  // --- Sync hash with selected review and fit ---
  useEffect(() => {
    if (selectedReviewId && selectedFitName) {
      updateHash(selectedReviewId, selectedFitName);
    }
  }, [selectedReviewId, selectedFitName]);

  // --- Computed pathway data (no activations needed) ---
  const scoredPathways = useMemo(() =>
    pathways
      ? pathways.components.map((comp, i) => computeScoredPathway(comp, pathwayScores[i] ?? 0))
      : [],
    [pathways, pathwayScores],
  );

  const sumActivations = useMemo(() =>
    pathways ? computeSum(pathways.mean, scoredPathways) : [],
    [pathways, scoredPathways],
  );

  // --- Standardized activations (needs raw activations + scaler) ---
  const activationsStandardized = useMemo(() => {
    if (!currentRawActivations || !scaler) return null;
    return standardizeActivations(currentRawActivations, scaler.mean, scaler.scale);
  }, [currentRawActivations, scaler]);

  // --- Noise / residual (needs standardized activations) ---
  const noise = useMemo(() => {
    if (!activationsStandardized) return null;
    return activationsStandardized.map((v, i) => v - sumActivations[i]);
  }, [activationsStandardized, sumActivations]);

  const computedR2 = useMemo(() => {
    if (!activationsStandardized) return null;
    const original = activationsStandardized;
    const n = original.length;
    const mean = original.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      ssRes += (original[i] - sumActivations[i]) ** 2;
      ssTot += (original[i] - mean) ** 2;
    }
    return 1 - ssRes / ssTot;
  }, [activationsStandardized, sumActivations]);

  // --- Scale computations ---
  const patternsAbsMax = useMemo(() =>
    pathways ? computeAbsMax(...pathways.components) : 1,
    [pathways],
  );

  const scoredAbsMax = useMemo(() =>
    scoredPathways.length > 0 ? computeAbsMax(...scoredPathways) : 1,
    [scoredPathways],
  );

  const perReviewAbsMax = useMemo(() => {
    const allArrays = [
      ...(pathways ? pathways.components : []),
      ...scoredPathways,
      sumActivations,
      ...(activationsStandardized ? [activationsStandardized] : []),
      ...(noise ? [noise] : []),
    ];
    return allArrays.length > 0 ? computeAbsMax(...allArrays) : 1;
  }, [pathways, scoredPathways, sumActivations, activationsStandardized, noise]);

  const activationsAbsMax = useMemo(() => {
    const arrays = [
      ...(activationsStandardized ? [activationsStandardized] : []),
      sumActivations,
      ...(noise ? [noise] : []),
    ];
    return arrays.length > 0 ? computeAbsMax(...arrays) : 1;
  }, [activationsStandardized, sumActivations, noise]);

  const rawAbsMax = useMemo(() =>
    currentRawActivations ? computeAbsMax(currentRawActivations) : 1,
    [currentRawActivations],
  );

  const scalerMeanAbsMax = useMemo(() =>
    scaler ? computeAbsMax(scaler.mean) : 1,
    [scaler],
  );

  const scalerScaleNormalized = useMemo(() => {
    if (!scaler) return { min: 1, max: 1, data: [] };
    const vals = scaler.scale;
    let min = Infinity;
    let max = -Infinity;
    for (const v of vals) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    return {
      min,
      max,
      data: vals.map(v => v <= 1
        ? -Math.log(v) / logMin
        : Math.log(v) / logMax
      ),
    };
  }, [scaler]);

  const absMax = perReviewAbsMax;

  const patternsScale = scaleMode === "multiple-scales" ? patternsAbsMax : absMax;
  const scoredScale = scaleMode === "multiple-scales" ? scoredAbsMax : absMax;
  const activationsScale = scaleMode === "multiple-scales" ? activationsAbsMax : absMax;

  const colorLegendProps = { scaleType, valueScaling, showStats };

  // --- Loading / error states ---
  if (loadError) {
    return <div className="app-loading">Error loading data: {loadError}</div>;
  }

  if (!indexData || !pathways || !metadata || !scaler) {
    return <div className="app-loading">Loading index data...</div>;
  }

  const fitNames = Object.keys(indexData.metadata.fa_fits);
  const hasActivations = activationsStandardized != null;

  return (
    <div className="app">
      {/* Row 1: Toolbar spanning both columns */}
      <div className="toolbar">
        <label className="scale-mode-label">FA Fit:</label>
        <select
          className="scale-selector"
          value={selectedFitName}
          onChange={e => handleFitChange(e.target.value)}
        >
          {fitNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
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
        <label className="stats-toggle">
          <input type="checkbox" checked={showScaler}
            onChange={e => setShowScaler(e.target.checked)} />
          Show Scaler
        </label>
        <label className="stats-toggle">
          <input type="checkbox" checked={terminologyMode === "fa"}
            onChange={e => setTerminologyMode(e.target.checked ? "fa" : "project")} />
          FA terminology
        </label>
      </div>

      {/* Row 2, Col 1: Color legend when current-review mode */}
      <div className="color-legend-cell">
        {scaleMode === "current-review" && (
          <ColorLegend absMax={absMax} {...colorLegendProps} />
        )}
      </div>
      {/* Row 2, Col 2: Pathway patterns */}
      <div className="pathway-patterns-container">
        <PathwayPatterns
          components={pathways.components}
          absMax={patternsScale}
          scaleType={scaleType}
          valueScaling={valueScaling}
          showStats={showStats}
          explainedVariance={metadata.explained_variance_per_pathway}
          noiseVariance={pathways.noise_variance}
          terminologyMode={terminologyMode}
          legend={scaleMode === "multiple-scales"
            ? <ColorLegend absMax={patternsScale} {...colorLegendProps} />
            : undefined}
        />
      </div>

      <div className="row-divider" />

      {/* Row 3, Col 1: Review info */}
      <ReviewPanel
        reviews={indexData.reviews}
        selectedReview={selectedReview}
        onSelectReview={handleSelectReview}
        activationsLoading={activationsLoading}
      >
        {scaleMode !== "current-review" && (
          <ColorLegend absMax={activationsScale} {...colorLegendProps} />
        )}
      </ReviewPanel>
      {/* Row 3, Col 2: Scores + Scored pathways */}
      <div className="pathway-grid-container">
        <PathwayScoresRow
          pathwayScores={pathwayScores}
          originalScores={pathwayScoresFromIndex}
          onScoreChange={handleScoreChange}
          terminologyMode={terminologyMode}
          extraColumns={pathways.noise_variance ? 1 : 0}
        />
        <ScoredPathwaysView
          scoredPathways={scoredPathways}
          absMax={scoredScale}
          scaleType={scaleType}
          valueScaling={valueScaling}
          showStats={showStats}
          terminologyMode={terminologyMode}
          legend={scaleMode === "multiple-scales"
            ? <ColorLegend absMax={scoredScale} {...colorLegendProps} />
            : undefined}
        />
        <div className="comparison-equals">=</div>
      </div>

      {/* Row 4: Activation comparison (only when activations loaded) */}
      {hasActivations ? (
        <>
          <div className="comparison-original">
            <div className="comparison-section-label">{getLabel("originalActivations", terminologyMode)}</div>
            <Heatmap
              data={activationsStandardized} absMax={activationsScale}
              scaleType={scaleType} valueScaling={valueScaling}
              showStats={showStats}
            />
          </div>
          <div className="comparison-result">
            <div className="comparison-result-item">
              <div className="comparison-section-label">Reconstructed</div>
              <Heatmap
                data={sumActivations} absMax={activationsScale}
                scaleType={scaleType} valueScaling={valueScaling}
                showStats={showStats}
              />
            </div>
            <div className="comparison-result-item">
              <div className="comparison-section-label">Residual</div>
              <Heatmap
                data={noise!} absMax={activationsScale}
                scaleType={scaleType} valueScaling={valueScaling}
                showStats={showStats}
              />
            </div>
            {showStats && (
              <div className="comparison-result-item comparison-r2">
                <div className="comparison-section-label">R²</div>
                <div className="r2-value">
                  {computedR2 != null ? `${(computedR2 * 100).toFixed(1)}%` : "—"}
                </div>
                {Object.keys(effectiveOverrides).length > 0 && reviewR2 != null && (
                  <>
                    <div className="comparison-section-label">Original R²</div>
                    <div className="r2-value r2-value-secondary">
                      {(reviewR2 * 100).toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="comparison-original">
            <div className="comparison-section-label">{getLabel("originalActivations", terminologyMode)}</div>
            {activationsLoading
              ? <div className="activation-placeholder">Loading...</div>
              : <div className="activation-placeholder">Select a review</div>}
          </div>
          <div className="comparison-result">
            <div className="comparison-section-label">Reconstructed</div>
            {activationsLoading
              ? <div className="activation-placeholder">Loading...</div>
              : <div className="activation-placeholder">Select a review</div>}
          </div>
        </>
      )}

      {showScaler && hasActivations && currentRawActivations &&
        <>
          <div className="row-divider" />
          <div className="scaler-original">
            <div className="comparison-section-label">Raw neuron activations</div>
            <Heatmap
              data={currentRawActivations} absMax={rawAbsMax}
              scaleType={scaleType} valueScaling={valueScaling}
              showStats={showStats}
            />
            <ColorLegend absMax={rawAbsMax} {...colorLegendProps} />
          </div>
          <div className="scaler-result">
            <div className="comparison-result-item">
              <div className="comparison-section-label">Scaler Mean</div>
              <Heatmap
                data={scaler.mean} absMax={scalerMeanAbsMax}
                scaleType={scaleType} valueScaling={valueScaling}
                showStats={showStats}
              />
              <ColorLegend absMax={scalerMeanAbsMax} {...colorLegendProps} />
            </div>
            <div className="comparison-result-item">
              <div className="comparison-section-label">Scaler Scale (log)</div>
              <Heatmap
                data={scalerScaleNormalized.data} absMax={1}
                scaleType={scaleType} valueScaling="linear"
                showStats={showStats}
                formatStat={v => v < 0
                  ? Math.exp(-v * Math.log(scalerScaleNormalized.min))
                  : Math.exp(v * Math.log(scalerScaleNormalized.max))}
              />
              <ColorLegend
                absMax={1} scaleType={scaleType}
                valueScaling="linear" showStats={showStats}
                minLabel={scalerScaleNormalized.min.toFixed(2)}
                centerLabel="1"
                maxLabel={scalerScaleNormalized.max.toFixed(2)}
              />
            </div>
          </div>
        </>}
    </div>
  );
};
