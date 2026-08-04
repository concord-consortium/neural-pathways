import React, { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from "react";
import { filter, parse } from "liqe";
import { S3Index, S3Item, S3ShapBucket, ItemShapData } from "../../shared/types/s3-data";
import { ScaleMode, ScaleExtents, WordColorMode, WordScaleScope, ViewMode } from "../types/explorer-data";
import { fetchIndex, fetchShap } from "../../shared/data-loader";
import { flattenItem } from "../utils/flatten-item";
import { buildSeries } from "../utils/build-series";
import { ActiveDataset, activateDataset } from "../../shared/datasets/dataset-config";
import { DATASET_LIST, DEFAULT_DATASET_ID, datasetFromId } from "../../shared/datasets/registry";
import { SearchInput } from "./search-input";
import { ResultsPanel } from "./results-panel";
import { ItemPanel } from "./item-panel";
import { PathwayPanel } from "./pathway-panel";
import { WordEffectsPanel } from "./word-effects-panel";
import { SettingsMenu } from "./settings-menu";
import { CorrelationsView } from "./correlations-view";
import { DatasetSelector } from "./dataset-selector";

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

function updateHash(
  datasetId: string, itemId: string | null, fitName: string, query?: string, view?: ViewMode,
) {
  const parts: string[] = [];
  if (datasetId !== DEFAULT_DATASET_ID) parts.push(`dataset=${encodeURIComponent(datasetId)}`);
  if (itemId) parts.push(`item=${encodeURIComponent(itemId)}`);
  if (fitName) parts.push(`fit=${encodeURIComponent(fitName)}`);
  if (query) parts.push(`q=${encodeURIComponent(query)}`);
  if (view && view !== "explore") parts.push(`view=${encodeURIComponent(view)}`);
  const newHash = parts.length > 0 ? `#${parts.join("&")}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname);
  }
}

export const App = () => {
  // --- Data loading state ---
  const [datasetId, setDatasetId] = useState<string>(() => datasetFromId(getHashParams().dataset).id);
  const datasetConfig = datasetFromId(datasetId);
  const [indexData, setIndexData] = useState<S3Index | null>(null);
  const [dataset, setDataset] = useState<ActiveDataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFitName, setSelectedFitName] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const shapCacheRef = useRef<Map<string, S3ShapBucket>>(new Map());
  const [rawShapData, setRawShapData] = useState<ItemShapData | null>(null);
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
  const [viewMode, setViewMode] = useState<ViewMode>("explore");

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredQuery = useDeferredValue(searchQuery);

  // --- Dataset switching (selector or hash) ---
  // View mode is deliberately not reset: Explore versus Correlations is a
  // statement about how you are looking, not about what. The SHAP cache must be
  // cleared — it is keyed by fit/bucket, and two datasets can share a bucket name.
  const handleDatasetChange = useCallback((id: string) => {
    if (id === datasetId) return;
    setDatasetId(id);
    setIndexData(null);
    setDataset(null);
    setLoadError(null);
    setSelectedItemId(null);
    setSelectedPathways(new Set());
    setSearchQuery("");
    setSelectedFitName("");
    shapCacheRef.current = new Map();
    setRawShapData(null);
    setShapLoadedKey("");
    setShapFetchFailed(false);
  }, [datasetId]);

  // --- Flatten items for search ---
  const flatItems = useMemo(() => {
    if (!indexData || !dataset) return [];
    return indexData.items.map(r => flattenItem(r, selectedFitName, dataset));
  }, [indexData, dataset, selectedFitName]);

  // --- Filter items with liqe ---
  const { filteredItems, searchError } = useMemo(() => {
    if (!indexData) return { filteredItems: [] as S3Item[], searchError: false };
    if (!deferredQuery.trim()) {
      return { filteredItems: indexData.items, searchError: false };
    }
    try {
      const ast = parse(deferredQuery);
      const matched = filter(ast, flatItems);
      // Map flat results back to S3Item objects by index
      const matchedSet = new Set(matched.map(m => flatItems.indexOf(m)));
      return { filteredItems: indexData.items.filter((_, i) => matchedSet.has(i)), searchError: false };
    } catch {
      // On parse error, return all items as a safe fallback
      return { filteredItems: indexData.items, searchError: true };
    }
  }, [indexData, deferredQuery, flatItems]);

  // --- Clear selection when it's not in filtered results ---
  const effectiveSelectedItemId = selectedItemId && filteredItems.some(r => r.id === selectedItemId)
    ? selectedItemId : null;

  // --- Fetch index on dataset change (including the initial mount) ---
  useEffect(() => {
    // Switching datasets twice in quick succession (dropdown fumble, or two
    // hashchange events from browser back/forward) leaves two fetches in
    // flight. Without this guard, whichever response lands last wins — even
    // if it belongs to a dataset the user has already switched away from —
    // and silently overwrites the UI with a mismatched index and attribute
    // set. The SHAP effect below protects itself the same way.
    let cancelled = false;
    fetchIndex(datasetConfig)
      .then(data => {
        if (cancelled) return;
        // resolveAttributes validates a list that, for a generated dataset,
        // arrived over the network — so it can throw. Doing this here routes a
        // bad index to the error state instead of throwing during render.
        setDataset(activateDataset(datasetConfig, data));
        setIndexData(data);
        const names = Object.keys(data.metadata.fa_fits);
        const hashParams = getHashParams();
        // A dropdown-driven switch leaves the previous dataset's item/fit/query
        // sitting in the URL until the hash-sync effect below catches up with
        // the reset state; only a hash that already names this dataset (a true
        // navigation, including the initial load) is trustworthy here.
        if (datasetFromId(hashParams.dataset).id === datasetId) {
          const fitName = hashParams.fit && names.includes(hashParams.fit)
            ? hashParams.fit : names[0];
          setSelectedFitName(fitName);
          if (hashParams.q) {
            setSearchQuery(hashParams.q);
          }
          if (hashParams.view === "correlations") {
            setViewMode("correlations");
          }
          if (data.items.length > 0) {
            const itemId = hashParams.item && data.items.some(r => r.id === hashParams.item)
              ? hashParams.item : null;
            if (itemId) {
              setSelectedItemId(itemId);
            }
          }
        } else {
          setSelectedFitName(names[0]);
        }
      })
      .catch(err => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => { cancelled = true; };
  }, [datasetId, datasetConfig]);

  // --- Selected item ---
  const selectedItem = useMemo(
    () => indexData?.items.find(r => r.id === effectiveSelectedItemId),
    [indexData, effectiveSelectedItemId],
  );

  // --- SHAP availability ---
  const hasShapForCurrentFit = selectedItem?.has_shap?.includes(selectedFitName) ?? false;
  const shapAvailableFits = selectedItem?.has_shap ?? [];

  // --- Fetch SHAP when item or fit changes ---
  const shapRequestKey = hasShapForCurrentFit ? `${effectiveSelectedItemId}:${selectedFitName}` : "";
  useEffect(() => {
    if (!effectiveSelectedItemId || !hasShapForCurrentFit) return;
    let cancelled = false;
    const key = `${effectiveSelectedItemId}:${selectedFitName}`;
    fetchShap(datasetConfig, effectiveSelectedItemId, selectedFitName, shapCacheRef.current)
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
  }, [effectiveSelectedItemId, selectedFitName, hasShapForCurrentFit, datasetConfig]);

  // Treat SHAP data as null if it doesn't match the current item+fit
  const shapDataCurrent = shapLoadedKey === shapRequestKey;
  const currentShapData = shapDataCurrent ? rawShapData : null;
  const shapLoading = shapRequestKey !== "" && !shapDataCurrent && !shapFetchFailed;

  // --- Sync hash (write on state change, read on hashchange) ---
  useEffect(() => {
    if (selectedFitName) {
      updateHash(datasetId, effectiveSelectedItemId, selectedFitName, searchQuery || undefined, viewMode);
    }
  }, [datasetId, effectiveSelectedItemId, selectedFitName, searchQuery, viewMode]);

  useEffect(() => {
    if (!indexData) return;
    const handleHashChange = () => {
      const hashParams = getHashParams();
      const hashDatasetId = datasetFromId(hashParams.dataset).id;
      if (hashDatasetId !== datasetId) {
        // A new dataset name in the hash — load it the same way the selector
        // does. The fetch effect applies this same hash's item/fit/q once the
        // new dataset's data arrives.
        handleDatasetChange(hashDatasetId);
        return;
      }
      const validFits = Object.keys(indexData.metadata.fa_fits);
      if (hashParams.fit && validFits.includes(hashParams.fit)) {
        setSelectedFitName(hashParams.fit);
      }
      if (hashParams.item && indexData.items.some(r => r.id === hashParams.item)) {
        setSelectedItemId(hashParams.item);
      }
      if (hashParams.q !== undefined) {
        setSearchQuery(hashParams.q);
      }
      setViewMode(hashParams.view === "correlations" ? "correlations" : "explore");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [indexData, datasetId, handleDatasetChange]);

  // --- Derived fit data ---
  const selectedFit = indexData?.metadata.fa_fits[selectedFitName] ?? null;

  const correlationSeries = useMemo(() => {
    if (viewMode !== "correlations" || !selectedFit || !dataset) return [];
    return buildSeries(filteredItems, dataset, selectedFitName, selectedFit.n_pathways);
  }, [viewMode, filteredItems, dataset, selectedFitName, selectedFit]);

  const pathwayScores = useMemo(
    () => selectedItem?.pathway_scores[selectedFitName] ?? [],
    [selectedItem, selectedFitName],
  );

  const varianceFractions = useMemo(
    () => selectedItem?.pathway_variance_fractions[selectedFitName] ?? [],
    [selectedItem, selectedFitName],
  );

  const reconstructionR2 = selectedItem?.reconstruction_r2?.[selectedFitName] ?? null;

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

  // --- Item selection (resets selected pathways) ---
  const handleSelectItem = useCallback((item: S3Item) => {
    setSelectedItemId(item.id);
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

  if (!indexData || !dataset) {
    return <div className="explorer-loading">Loading index data...</div>;
  }

  const fitNames = Object.keys(indexData.metadata.fa_fits);

  return (
    <div className="explorer-app">
      <h1 className="explorer-title">Pathway Explorer</h1>

      <div className="explorer-top-bar">
        <DatasetSelector
          datasets={DATASET_LIST}
          selectedId={datasetId}
          onChange={handleDatasetChange}
        />
        {fitNames.length > 1 && (
          <>
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
          </>
        )}
        <SearchInput
          query={searchQuery}
          onQueryChange={setSearchQuery}
          hasError={searchError}
          numPathways={selectedFit?.n_pathways}
          attributes={dataset.attributes}
        />
        <div className="explorer-view-toggle" role="group" aria-label="View mode">
          <button
            className={`explorer-view-button${viewMode === "explore" ? " active" : ""}`}
            onClick={() => setViewMode("explore")}
          >
            Explore
          </button>
          <button
            className={`explorer-view-button${viewMode === "correlations" ? " active" : ""}`}
            onClick={() => setViewMode("correlations")}
          >
            Correlations
          </button>
        </div>
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
          items={filteredItems}
          fitName={selectedFitName}
          selectedItemId={effectiveSelectedItemId}
          onSelectItem={handleSelectItem}
          maxAbsScore={Math.max(Math.abs(scaleExtents.shared[0]), Math.abs(scaleExtents.shared[1]))}
          resultCount={filteredItems.length}
          totalCount={indexData.items.length}
        />
        {viewMode === "correlations" ? (
          <CorrelationsView
            series={correlationSeries}
            resultCount={filteredItems.length}
            totalCount={indexData.items.length}
          />
        ) : selectedItem ? (
          <div className="explorer-main">
            <div className="explorer-left-column">
              <ItemPanel
                item={selectedItem}
                reconstructionR2={reconstructionR2}
                attributes={dataset.attributes}
                getAttributeValue={dataset.getAttributeValue}
              />
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
