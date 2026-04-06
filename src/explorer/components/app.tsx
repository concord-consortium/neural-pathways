import React, { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from "react";
import { filter, parse } from "liqe";
import { S3Index, S3Review, S3ShapBucket, ReviewShapData } from "../../shared/types/s3-data";
import { ScaleMode, ScaleExtents, WordColorMode, WordScaleScope } from "../types/explorer-data";
import { fetchIndex, fetchShap } from "../../shared/data-loader";
import { flattenReview } from "../utils/flatten-review";
import { SearchInput } from "./search-input";
import { ResultsPanel } from "./results-panel";
import { ReviewPanel } from "./review-panel";
import { PathwayPanel } from "./pathway-panel";
import { WordEffectsPanel } from "./word-effects-panel";
import { SettingsMenu } from "./settings-menu";

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

function updateHash(reviewId: string | null, fitName: string, query?: string) {
  const parts: string[] = [];
  if (reviewId) parts.push(`review=${encodeURIComponent(reviewId)}`);
  if (fitName) parts.push(`fit=${encodeURIComponent(fitName)}`);
  if (query) parts.push(`q=${encodeURIComponent(query)}`);
  const newHash = parts.length > 0 ? `#${parts.join("&")}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname);
  }
}

export const App = () => {
  // --- Data loading state ---
  const [indexData, setIndexData] = useState<S3Index | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFitName, setSelectedFitName] = useState<string>("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const shapCacheRef = useRef<Map<string, S3ShapBucket>>(new Map());
  const [rawShapData, setRawShapData] = useState<ReviewShapData | null>(null);
  const [shapLoadedKey, setShapLoadedKey] = useState<string>("");
  const [shapFetchFailed, setShapFetchFailed] = useState(false);

  // --- UI state ---
  const [scaleMode, setScaleMode] = useState<ScaleMode>("shared");
  const [showVarianceFractions, setShowVarianceFractions] = useState(false);
  const [showExtents, setShowExtents] = useState(false);
  const [selectedPathways, setSelectedPathways] = useState<Set<number>>(new Set());
  const [wordColorMode, setWordColorMode] = useState<WordColorMode>("score");
  const [showPathwayValues, setShowPathwayValues] = useState(false);
  const [wordScaleScope, setWordScaleScope] = useState<WordScaleScope>("per-pathway");

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredQuery = useDeferredValue(searchQuery);

  // --- Flatten reviews for search ---
  const flatReviews = useMemo(() => {
    if (!indexData) return [];
    return indexData.reviews.map(r => flattenReview(r, selectedFitName));
  }, [indexData, selectedFitName]);

  // --- Filter reviews with liqe ---
  const { filteredReviews, searchError } = useMemo(() => {
    if (!indexData) return { filteredReviews: [] as S3Review[], searchError: false };
    if (!deferredQuery.trim()) {
      return { filteredReviews: indexData.reviews, searchError: false };
    }
    try {
      const ast = parse(deferredQuery);
      const matched = filter(ast, flatReviews);
      // Map flat results back to S3Review objects by index
      const matchedSet = new Set(matched.map(m => flatReviews.indexOf(m)));
      return { filteredReviews: indexData.reviews.filter((_, i) => matchedSet.has(i)), searchError: false };
    } catch {
      // On parse error, return all reviews as a safe fallback
      return { filteredReviews: indexData.reviews, searchError: true };
    }
  }, [indexData, deferredQuery, flatReviews]);

  // --- Clear selection when it's not in filtered results ---
  const effectiveSelectedReviewId = selectedReviewId && filteredReviews.some(r => r.id === selectedReviewId)
    ? selectedReviewId : null;

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
        if (hashParams.q) {
          setSearchQuery(hashParams.q);
        }
        if (data.reviews.length > 0) {
          const reviewId = hashParams.review && data.reviews.some(r => r.id === hashParams.review)
            ? hashParams.review : null;
          if (reviewId) {
            setSelectedReviewId(reviewId);
          }
        }
      })
      .catch(err => setLoadError(err.message));
  }, []);

  // --- Selected review ---
  const selectedReview = useMemo(
    () => indexData?.reviews.find(r => r.id === effectiveSelectedReviewId),
    [indexData, effectiveSelectedReviewId],
  );

  // --- SHAP availability ---
  const hasShapForCurrentFit = selectedReview?.has_shap?.includes(selectedFitName) ?? false;
  const shapAvailableFits = selectedReview?.has_shap ?? [];

  // --- Fetch SHAP when review or fit changes ---
  const shapRequestKey = hasShapForCurrentFit ? `${effectiveSelectedReviewId}:${selectedFitName}` : "";
  useEffect(() => {
    if (!effectiveSelectedReviewId || !hasShapForCurrentFit) return;
    let cancelled = false;
    const key = `${effectiveSelectedReviewId}:${selectedFitName}`;
    fetchShap(effectiveSelectedReviewId, selectedFitName, shapCacheRef.current)
      .then(data => {
        if (!cancelled) {
          setRawShapData(data);
          setShapLoadedKey(key);
          setShapFetchFailed(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error("Failed to fetch SHAP:", err);
          setShapFetchFailed(true);
        }
      });
    return () => { cancelled = true; };
  }, [effectiveSelectedReviewId, selectedFitName, hasShapForCurrentFit]);

  // Treat SHAP data as null if it doesn't match the current review+fit
  const shapDataCurrent = shapLoadedKey === shapRequestKey;
  const currentShapData = shapDataCurrent ? rawShapData : null;
  const shapLoading = shapRequestKey !== "" && !shapDataCurrent && !shapFetchFailed;

  // --- Sync hash (write on state change, read on hashchange) ---
  useEffect(() => {
    if (selectedFitName) {
      updateHash(effectiveSelectedReviewId, selectedFitName, searchQuery || undefined);
    }
  }, [effectiveSelectedReviewId, selectedFitName, searchQuery]);

  useEffect(() => {
    if (!indexData) return;
    const handleHashChange = () => {
      const hashParams = getHashParams();
      const validFits = Object.keys(indexData.metadata.fa_fits);
      if (hashParams.fit && validFits.includes(hashParams.fit)) {
        setSelectedFitName(hashParams.fit);
      }
      if (hashParams.review && indexData.reviews.some(r => r.id === hashParams.review)) {
        setSelectedReviewId(hashParams.review);
      }
      if (hashParams.q !== undefined) {
        setSearchQuery(hashParams.q);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [indexData]);

  // --- Derived fit data ---
  const selectedFit = indexData?.metadata.fa_fits[selectedFitName] ?? null;

  const pathwayScores = useMemo(
    () => selectedReview?.pathway_scores[selectedFitName] ?? [],
    [selectedReview, selectedFitName],
  );

  const varianceFractions = useMemo(
    () => selectedReview?.pathway_variance_fractions[selectedFitName] ?? [],
    [selectedReview, selectedFitName],
  );

  const reconstructionR2 = selectedReview?.reconstruction_r2[selectedFitName] ?? null;

  const scaleExtents = useMemo<ScaleExtents>(() => {
    if (!selectedFit) return { shared: [0, 0], perPathway: [] };
    const mins = selectedFit.pathway_score_min;
    const maxs = selectedFit.pathway_score_max;
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (let i = 0; i < mins.length; i++) {
      if (mins[i] < globalMin) globalMin = mins[i];
      if (maxs[i] > globalMax) globalMax = maxs[i];
    }
    return {
      shared: [globalMin, globalMax],
      perPathway: mins.map((min, i) => [min, maxs[i]] as [number, number]),
    };
  }, [selectedFit]);

  const handlePathwayClick = useCallback((index: number) => {
    setSelectedPathways(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // --- Review selection (resets selected pathways) ---
  const handleSelectReview = useCallback((review: S3Review) => {
    setSelectedReviewId(review.id);
    setSelectedPathways(new Set());
  }, []);

  // --- Fit change (resets selected pathways) ---
  const handleFitChange = useCallback((fitName: string) => {
    setSelectedFitName(fitName);
    setSelectedPathways(new Set());
  }, []);

  // --- Loading / error states ---
  if (loadError) {
    return <div className="explorer-loading">Error loading data: {loadError}</div>;
  }

  if (!indexData) {
    return <div className="explorer-loading">Loading index data...</div>;
  }

  const fitNames = Object.keys(indexData.metadata.fa_fits);

  return (
    <div className="explorer-app">
      <h1 className="explorer-title">Pathway Explorer</h1>

      <div className="explorer-top-bar">
        <label className="explorer-fit-label">FA Fit:</label>
        <select
          className="explorer-fit-selector"
          value={selectedFitName}
          onChange={e => handleFitChange(e.target.value)}
        >
          {fitNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <SearchInput
          query={searchQuery}
          onQueryChange={setSearchQuery}
          hasError={searchError}
          numPathways={selectedFit?.n_pathways}
        />
        <SettingsMenu
          scaleMode={scaleMode}
          onScaleModeChange={setScaleMode}
          showVarianceFractions={showVarianceFractions}
          onShowVarianceFractionsChange={setShowVarianceFractions}
          showExtents={showExtents}
          onShowExtentsChange={setShowExtents}
          wordColorMode={wordColorMode}
          onWordColorModeChange={setWordColorMode}
          showPathwayValues={showPathwayValues}
          onShowPathwayValuesChange={setShowPathwayValues}
          wordScaleScope={wordScaleScope}
          onWordScaleScopeChange={setWordScaleScope}
        />
      </div>

      <div className="explorer-body">
        <ResultsPanel
          reviews={filteredReviews}
          fitName={selectedFitName}
          selectedReviewId={effectiveSelectedReviewId}
          onSelectReview={handleSelectReview}
          maxAbsScore={Math.max(Math.abs(scaleExtents.shared[0]), Math.abs(scaleExtents.shared[1]))}
          resultCount={filteredReviews.length}
          totalCount={indexData.reviews.length}
        />
        {selectedReview ? (
          <div className="explorer-main">
            <div className="explorer-left-column">
              <ReviewPanel review={selectedReview} reconstructionR2={reconstructionR2} />
              <WordEffectsPanel
                shapData={currentShapData}
                shapLoading={shapLoading}
                hasShapForCurrentFit={hasShapForCurrentFit}
                shapAvailableFits={shapAvailableFits}
                currentFitName={selectedFitName}
                selectedPathways={selectedPathways}
                wordColorMode={wordColorMode}
                wordScaleScope={wordScaleScope}
                showPathwayValues={showPathwayValues}
                onSwitchFit={handleFitChange}
              />
            </div>
            <PathwayPanel
              scores={pathwayScores}
              varianceFractions={varianceFractions}
              scaleMode={scaleMode}
              scaleExtents={scaleExtents}
              showVarianceFractions={showVarianceFractions}
              showExtents={showExtents}
              explainedVariancePerPathway={selectedFit?.explained_variance_per_pathway}
              pathwayImportance={selectedFit?.pathway_importance}
              onPathwayClick={handlePathwayClick}
              selectedPathways={selectedPathways}
            />
          </div>
        ) : (
          <div className="explorer-empty">
            Select a review from the results to see its pathway scores.
          </div>
        )}
      </div>
    </div>
  );
};
