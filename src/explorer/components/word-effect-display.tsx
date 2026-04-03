import React, { useMemo, useState } from "react";
import { WordEffect, WordColorMode } from "../types/explorer-data";
import { scoreToColor } from "../utils/score-to-color";
import { ColorScale } from "./color-scale";
import "./word-effect-display.scss";

interface WordEffectDisplayProps {
  pathwayIndex: number;
  words: WordEffect[];
  wordColorMode: WordColorMode;
  showPathwayValues: boolean;
  baseValue: number;
  unmaskedValue: number;
  sharedMaxAbsValue?: number;
  showColorScale: boolean;
}

const FILTERED_TOKENS = new Set(["[CLS]", "[SEP]"]);

function formatValue(value: number, mode: WordColorMode): string {
  if (mode === "impact") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(4);
}

export const WordEffectDisplay: React.FC<WordEffectDisplayProps> = ({
  pathwayIndex, words, wordColorMode, showPathwayValues, baseValue, unmaskedValue,
  sharedMaxAbsValue, showColorScale
}) => {
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  const filteredWords = useMemo(
    () => words.filter(w => !FILTERED_TOKENS.has(w.word)),
    [words]
  );

  const range = unmaskedValue - baseValue;

  const getColorValue = useMemo(() => {
    if (wordColorMode === "impact" && range !== 0) {
      return (w: WordEffect) => w.scores[pathwayIndex] / range;
    }
    return (w: WordEffect) => w.scores[pathwayIndex];
  }, [wordColorMode, range, pathwayIndex]);

  const localMaxAbsValue = useMemo(() => {
    let max = 0;
    for (const w of filteredWords) {
      const abs = Math.abs(getColorValue(w));
      if (abs > max) max = abs;
    }
    return max;
  }, [filteredWords, getColorValue]);

  const maxAbsValue = sharedMaxAbsValue ?? localMaxAbsValue;

  const handleWordClick = (index: number) => {
    setSelectedWordIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="word-effect-display">
      <div className="word-effect-header">
        <span>Pathway {pathwayIndex}</span>
        {showPathwayValues && (
          <span className="word-effect-values">
            base: {baseValue.toFixed(3)} | unmasked: {unmaskedValue.toFixed(3)}
          </span>
        )}
      </div>
      {showColorScale && (
        <ColorScale maxAbsValue={maxAbsValue} wordColorMode={wordColorMode} />
      )}
      <div className="word-effect-text">
        {filteredWords.map((w, i) => {
          const value = getColorValue(w);
          return (
            <span
              key={i}
              className={`word-effect-word${selectedWordIndex === i ? " word-effect-word-selected" : ""}`}
              style={{ backgroundColor: scoreToColor(value, maxAbsValue) }}
              onClick={() => handleWordClick(i)}
            >
              {selectedWordIndex === i && (
                <span className="word-effect-label">
                  {formatValue(value, wordColorMode)}
                </span>
              )}
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
