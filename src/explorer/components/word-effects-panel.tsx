import React from "react";
import { WordEffect } from "../types/explorer-data";
import { WordEffectDisplay } from "./word-effect-display";
import "./word-effects-panel.scss";

interface WordEffectsPanelProps {
  words: WordEffect[];
  selectedPathways: Set<number>;
}

export const WordEffectsPanel: React.FC<WordEffectsPanelProps> = ({
  words, selectedPathways
}) => {
  if (selectedPathways.size === 0) return null;

  const sortedIndices = Array.from(selectedPathways).sort((a, b) => a - b);

  return (
    <div className="word-effects-panel">
      {sortedIndices.map(i => (
        <WordEffectDisplay key={i} pathwayIndex={i} words={words} />
      ))}
    </div>
  );
};
