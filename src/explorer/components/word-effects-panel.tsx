import React, { useMemo } from "react";
import { WordEffect, WordColorMode, WordScaleScope } from "../types/explorer-data";
import { WordEffectDisplay } from "./word-effect-display";
import { ColorScale } from "./color-scale";
import "./word-effects-panel.scss";

const FILTERED_TOKENS = new Set(["[CLS]", "[SEP]"]);

interface WordEffectsPanelProps {
  words: WordEffect[];
  selectedPathways: Set<number>;
  wordColorMode: WordColorMode;
  wordScaleScope: WordScaleScope;
  showPathwayValues: boolean;
  baseValues: number[];
  unmaskedValues: number[];
}

export const WordEffectsPanel: React.FC<WordEffectsPanelProps> = ({
  words, selectedPathways, wordColorMode, wordScaleScope, showPathwayValues,
  baseValues, unmaskedValues
}) => {
  const sortedIndices = useMemo(
    () => Array.from(selectedPathways).sort((a, b) => a - b),
    [selectedPathways]
  );

  const filteredWords = useMemo(
    () => words.filter(w => !FILTERED_TOKENS.has(w.word)),
    [words]
  );

  const sharedMaxAbsValue = useMemo(() => {
    if (wordScaleScope !== "full-review" || sortedIndices.length === 0) return undefined;
    let max = 0;
    for (const w of filteredWords) {
      for (const idx of sortedIndices) {
        const range = unmaskedValues[idx] - baseValues[idx];
        const value = (wordColorMode === "impact" && range !== 0)
          ? w.scores[idx] / range
          : w.scores[idx];
        const abs = Math.abs(value);
        if (abs > max) max = abs;
      }
    }
    return max;
  }, [wordScaleScope, filteredWords, sortedIndices, wordColorMode, baseValues, unmaskedValues]);

  if (selectedPathways.size === 0) return null;

  return (
    <div className="word-effects-panel">
      {wordScaleScope === "full-review" && sharedMaxAbsValue != null && (
        <ColorScale maxAbsValue={sharedMaxAbsValue} wordColorMode={wordColorMode} />
      )}
      {sortedIndices.map(i => (
        <WordEffectDisplay
          key={i}
          pathwayIndex={i}
          words={words}
          wordColorMode={wordColorMode}
          showPathwayValues={showPathwayValues}
          showColorScale={wordScaleScope === "per-pathway"}
          baseValue={baseValues[i]}
          unmaskedValue={unmaskedValues[i]}
          sharedMaxAbsValue={sharedMaxAbsValue}
        />
      ))}
    </div>
  );
};
