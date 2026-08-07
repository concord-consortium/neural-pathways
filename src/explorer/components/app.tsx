import React, { useState, useMemo, useDeferredValue, useCallback, useEffect, useRef } from "react";
import { filter, parse } from "liqe";
import { S3Index, S3Item, S3ShapBucket, ItemShapData } from "../../shared/types/s3-data";
import { ScaleMode, ScaleExtents, WordColorMode, WordScaleScope, ViewMode } from "../types/explorer-data";
import { fetchIndex, fetchShap } from "../../shared/data-loader";
import { flattenItem } from "../utils/flatten-item";
import { buildSeries } from "../utils/build-series";
import {
  LoadedDataset, activateDataset, applyCommissions, codeableAttributes, NO_COMMISSIONS,
} from "../../shared/datasets/dataset-config";
import { DATASET_LIST, DEFAULT_DATASET_ID, datasetFromId } from "../../shared/datasets/registry";
import { SearchInput } from "./search-input";
import { ResultsPanel } from "./results-panel";
import { ItemPanel } from "./item-panel";
import { PathwayPanel } from "./pathway-panel";
import { WordEffectsPanel } from "./word-effects-panel";
import { SettingsMenu } from "./settings-menu";
import { CorrelationsView } from "./correlations-view";
import { FieldsView } from "./fields-view";
import { DatasetSelector } from "./dataset-selector";
import { CodingsMenu } from "./codings-menu";

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

interface HashState {
  datasetId: string;
  itemId: string | null;
  fitName: string;
  query?: string;
  view?: ViewMode;
  commissioned: ReadonlySet<string>;
}

function updateHash(state: HashState) {
  const parts: string[] = [];
  if (state.datasetId !== DEFAULT_DATASET_ID) parts.push(`dataset=${encodeURIComponent(state.datasetId)}`);
  if (state.itemId) parts.push(`item=${encodeURIComponent(state.itemId)}`);
  if (state.fitName) parts.push(`fit=${encodeURIComponent(state.fitName)}`);
  if (state.query) parts.push(`q=${encodeURIComponent(state.query)}`);
  if (state.view && state.view !== "explore") parts.push(`view=${encodeURIComponent(state.view)}`);
  if (state.commissioned.size > 0) {
    // Each key is encoded individually, joined by a literal comma, rather than
    // encoding the whole joined string — the latter turns "," into "%2C" and
    // still round-trips through getHashParams's decodeURIComponent, but the
    // resulting hash would no longer read as "coded=a,b" to anyone eyeballing
    // or diffing a shared link.
    const keys = [...state.commissioned].sort().map(encodeURIComponent).join(",");
    parts.push(`coded=${keys}`);
  }
  const newHash = parts.length > 0 ? `#${parts.join("&")}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname);
  }
}

/** Splits the coded param. Validation happens once the dataset's attributes arrive. */
function parseCommissioned(value: string | undefined): ReadonlySet<string> {
  if (!value) return NO_COMMISSIONS;
  return new Set(value.split(",").filter(Boolean));
}

const VIEW_MODES: ViewMode[] = ["explore", "correlations", "fields"];

/**
 * Anything unrecognised degrades to explore, the same way an unknown coded key
 * is dropped: a hand-edited or stale hash should show something rather than
 * nothing. Centralised so a fourth view cannot be half-added — both the
 * index-fetch effect and the hashchange handler read the view through here.
 */
function parseViewMode(value: string | undefined): ViewMode {
  // find rather than includes + cast: casting `string | undefined` to ViewMode
  // is a comparison TypeScript rejects, and the find narrows for free.
  return VIEW_MODES.find(mode => mode === value) ?? "explore";
}

export const App = () => {
  // --- Data loading state ---
  const [datasetId, setDatasetId] = useState<string>(() => datasetFromId(getHashParams().dataset).id);
  const datasetConfig = datasetFromId(datasetId);
  const [indexData, setIndexData] = useState<S3Index | null>(null);
  const [loaded, setLoaded] = useState<LoadedDataset | null>(null);
  const [commissioned, setCommissioned] = useState<ReadonlySet<string>>(
    () => parseCommissioned(getHashParams().coded),
  );

  const dataset = useMemo(
    () => (loaded ? applyCommissions(loaded, commissioned) : null),
    [loaded, commissioned],
  );
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
    setLoaded(null);
    setLoadError(null);
    setSelectedItemId(null);
    setSelectedPathways(new Set());
    setSearchQuery("");
    setSelectedFitName("");
    setCommissioned(NO_COMMISSIONS);
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
        const loadedDataset = activateDataset(datasetConfig, data);
        setLoaded(loadedDataset);
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
          setViewMode(parseViewMode(hashParams.view));
          if (data.items.length > 0) {
            const itemId = hashParams.item && data.items.some(r => r.id === hashParams.item)
              ? hashParams.item : null;
            if (itemId) {
              setSelectedItemId(itemId);
            }
          }
          const codeable = new Set(
            codeableAttributes(loadedDataset.allAttributes).map(a => a.key),
          );
          setCommissioned(new Set(
            [...parseCommissioned(hashParams.coded)].filter(key => codeable.has(key)),
          ));
        } else {
          setSelectedFitName(names[0]);
          setCommissioned(NO_COMMISSIONS);
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

  // Declared here, with the other memos, rather than after the loading
  // early-returns below: keeping the hook order stable across the loading and
  // loaded renders is what makes this safe. This is the one place in the app
  // that legitimately reads allAttributes.
  const codings = useMemo(
    () => (dataset ? codeableAttributes(dataset.allAttributes) : []),
    [dataset],
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
      updateHash({
        datasetId,
        itemId: effectiveSelectedItemId,
        fitName: selectedFitName,
        query: searchQuery || undefined,
        view: viewMode,
        commissioned,
      });
    }
  }, [datasetId, effectiveSelectedItemId, selectedFitName, searchQuery, viewMode, commissioned]);

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
      if (hashParams.coded !== undefined) {
        // Sanitized the same way as the initial-load path (the fetch effect,
        // above): without this, a pasted or hand-edited link with a junk key
        // (or Back to one) would set commissioned = {"bogus"} here, and the
        // hash-sync effect would then write that junk straight back into the
        // URL, where it persists and rides along on every subsequent link the
        // student copies — even though nothing renders visibly wrong, since
        // applyCommissions and codings-menu.tsx both already filter by key.
        // Do not "simplify" this back to the unfiltered brief snippet.
        const codeable = new Set(codings.map(c => c.key));
        setCommissioned(new Set(
          [...parseCommissioned(hashParams.coded)].filter(key => codeable.has(key)),
        ));
      } else {
        setCommissioned(NO_COMMISSIONS);
      }
      setViewMode(parseViewMode(hashParams.view));
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [indexData, datasetId, handleDatasetChange, codings]);

  // --- Derived fit data ---
  const selectedFit = indexData?.metadata.fa_fits[selectedFitName] ?? null;

  const filteredSeries = useMemo(() => {
    if (viewMode === "explore" || !selectedFit || !dataset) return [];
    return buildSeries(filteredItems, dataset, selectedFitName, selectedFit.n_pathways);
  }, [viewMode, filteredItems, dataset, selectedFitName, selectedFit]);

  // The whole dataset, which is what supplies the bins every histogram shares.
  // Gated on the fields view so Explore and Correlations pay nothing for it: the
  // cost is one buildSeries over the full index, paid on entering the view
  // rather than on every keystroke in a view that is not open.
  //
  // dataset is in the dependency list deliberately — commissioning a coding
  // changes dataset.attributes, and the baseline must gain the same field the
  // filtered series just gained.
  const baselineSeries = useMemo(() => {
    if (viewMode !== "fields" || !indexData || !selectedFit || !dataset) return [];
    return buildSeries(indexData.items, dataset, selectedFitName, selectedFit.n_pathways);
  }, [viewMode, indexData, dataset, selectedFitName, selectedFit]);

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

  // --- Commissioning (unlimited, one-way, with a single reset) ---
  const handleCommission = useCallback((key: string) => {
    setCommissioned(prev => (prev.has(key) ? prev : new Set([...prev, key])));
  }, []);

  const handleResetCommissions = useCallback(() => setCommissioned(NO_COMMISSIONS), []);

  // --- Loading / error states ---
  if (loadError) {
    // The dropdown is rendered here (rather than just showing the loading
    // message) so a dataset load failure is not a dead end: switching to a
    // working dataset — Yelp is always available — is the recovery path. The
    // "!indexData || !dataset" branch below still returns early during a
    // load, so this does not make a mid-load dataset switch reachable.
    return (
      <div className="explorer-app">
        <h1 className="explorer-title">Pathway Explorer</h1>
        <div className="explorer-top-bar">
          <DatasetSelector
            datasets={DATASET_LIST}
            selectedId={datasetId}
            onChange={handleDatasetChange}
          />
        </div>
        <div className="explorer-loading">Error loading data: {loadError}</div>
      </div>
    );
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
          itemNoun={dataset.config.itemNoun}
          searchPlaceholder={dataset.config.searchPlaceholder}
          searchFields={dataset.config.searchFields}
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
          <button
            className={`explorer-view-button${viewMode === "fields" ? " active" : ""}`}
            onClick={() => setViewMode("fields")}
          >
            Fields
          </button>
        </div>
        {codings.length > 0 && (
          <CodingsMenu
            codings={codings}
            commissioned={commissioned}
            itemCount={indexData.items.length}
            itemNoun={dataset.config.itemNoun}
            onCommission={handleCommission}
            onReset={handleResetCommissions}
          />
        )}
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
          itemNoun={dataset.config.itemNoun}
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
            series={filteredSeries}
            resultCount={filteredItems.length}
            totalCount={indexData.items.length}
            itemNoun={dataset.config.itemNoun}
          />
        ) : viewMode === "fields" ? (
          <FieldsView
            series={filteredSeries}
            baselineSeries={baselineSeries}
            resultCount={filteredItems.length}
            totalCount={indexData.items.length}
            itemNoun={dataset.config.itemNoun}
          />
        ) : selectedItem ? (
          <div className="explorer-main">
            <div className="explorer-left-column">
              <ItemPanel
                item={selectedItem}
                reconstructionR2={reconstructionR2}
                attributes={dataset.attributes}
                getAttributeValue={dataset.getAttributeValue}
                classificationLabels={dataset.config.classificationLabels}
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
                itemNoun={dataset.config.itemNoun}
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
              itemNoun={dataset.config.itemNoun}
            />
          </div>
        ) : (
          <div className="explorer-empty">
            Select a {dataset.config.itemNoun.singular} from the results to see its pathway scores.
          </div>
        )}
      </div>
    </div>
  );
};
