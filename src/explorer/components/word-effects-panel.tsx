import React, { useMemo } from "react";
import { WordColorMode, WordScaleScope } from "../types/explorer-data";
import { ItemShapData } from "../../shared/types/s3-data";
import { WordEffectDisplay } from "./word-effect-display";
import { ColorScale } from "./color-scale";
import "./word-effects-panel.scss";

interface WordEffectsPanelProps {
  shapData: ItemShapData | null;
  shapLoading: boolean;
  hasShapForCurrentFit: boolean;
  shapAvailableFits: string[];
  currentFitName: string;
  selectedPathways: Set<number>;
  wordColorMode: WordColorMode;
  wordScaleScope: WordScaleScope;
  showPathwayValues: boolean;
  onSwitchFit?: (fitName: string) => void;
  itemNoun: { singular: string; plural: string };
}

const FILTERED_TOKENS = new Set(["[CLS]", "[SEP]"]);

export const WordEffectsPanel: React.FC<WordEffectsPanelProps> = ({
  shapData, shapLoading, hasShapForCurrentFit, shapAvailableFits, currentFitName,
  selectedPathways, wordColorMode, wordScaleScope, showPathwayValues, onSwitchFit, itemNoun
}) => {
  const sortedIndices = useMemo(
    () => Array.from(selectedPathways).sort((a, b) => a - b),
    [selectedPathways]
  );

  const filteredWords = useMemo(
    () => shapData ? shapData.words.filter(w => !FILTERED_TOKENS.has(w.word)) : [],
    [shapData]
  );

  const sharedMaxAbsValue = useMemo(() => {
    if (wordScaleScope !== "full-item" || sortedIndices.length === 0 || !shapData) return undefined;
    let max = 0;
    for (const w of filteredWords) {
      for (const idx of sortedIndices) {
        const range = shapData.unmasked_values[idx] - shapData.base_values[idx];
        const value = (wordColorMode === "impact" && range !== 0)
          ? w.scores[idx] / range
          : w.scores[idx];
        const abs = Math.abs(value);
        if (abs > max) max = abs;
      }
    }
    return max;
  }, [wordScaleScope, filteredWords, sortedIndices, wordColorMode, shapData]);

  // Show availability message when no SHAP for current fit
  if (!hasShapForCurrentFit) {
    if (shapAvailableFits.length > 0) {
      return (
        <div className="word-effects-panel">
          <div className="word-effects-unavailable">
            No word effects for <strong>{currentFitName}</strong>. Available for:{" "}
            {shapAvailableFits.map((fit, i) => (
              <span key={fit}>
                {i > 0 && ", "}
                <button
                  className="word-effects-fit-link"
                  onClick={() => onSwitchFit?.(fit)}
                >
                  {fit}
                </button>
              </span>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="word-effects-panel">
        <div className="word-effects-unavailable">
          No word effects available for this {itemNoun.singular}.
        </div>
      </div>
    );
  }

  // Loading state
  if (shapLoading || !shapData) {
    return (
      <div className="word-effects-panel">
        <div className="word-effects-unavailable">Loading word effects...</div>
      </div>
    );
  }

  // No pathways selected
  if (selectedPathways.size === 0) {
    return (
      <div className="word-effects-panel">
        <div className="word-effects-hint">
          Click a pathway to see its word-level effects on this {itemNoun.singular}.
        </div>
      </div>
    );
  }

  return (
    <div className="word-effects-panel">
      {wordScaleScope === "full-item" && sharedMaxAbsValue != null && (
        <ColorScale maxAbsValue={sharedMaxAbsValue} wordColorMode={wordColorMode} />
      )}
      {sortedIndices.map(i => (
        <WordEffectDisplay
          key={i}
          pathwayIndex={i}
          words={shapData.words}
          wordColorMode={wordColorMode}
          showPathwayValues={showPathwayValues}
          showColorScale={wordScaleScope === "per-pathway"}
          baseValue={shapData.base_values[i]}
          unmaskedValue={shapData.unmasked_values[i]}
          sharedMaxAbsValue={sharedMaxAbsValue}
        />
      ))}
    </div>
  );
};
