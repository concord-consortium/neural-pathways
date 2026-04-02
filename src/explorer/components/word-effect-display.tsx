import React, { useMemo } from "react";
import { WordEffect } from "../types/explorer-data";
import { scoreToColor } from "../utils/score-to-color";
import "./word-effect-display.scss";

interface WordEffectDisplayProps {
  pathwayIndex: number;
  words: WordEffect[];
}

const FILTERED_TOKENS = new Set(["[CLS]", "[SEP]"]);

export const WordEffectDisplay: React.FC<WordEffectDisplayProps> = ({
  pathwayIndex, words
}) => {
  const filteredWords = useMemo(
    () => words.filter(w => !FILTERED_TOKENS.has(w.word)),
    [words]
  );

  const maxAbsScore = useMemo(() => {
    let max = 0;
    for (const w of filteredWords) {
      const abs = Math.abs(w.scores[pathwayIndex]);
      if (abs > max) max = abs;
    }
    return max;
  }, [filteredWords, pathwayIndex]);

  return (
    <div className="word-effect-display">
      <div className="word-effect-header">Pathway {pathwayIndex}</div>
      <div className="word-effect-text">
        {filteredWords.map((w, i) => (
          <span
            key={i}
            className="word-effect-word"
            style={{ backgroundColor: scoreToColor(w.scores[pathwayIndex], maxAbsScore) }}
          >
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
};
