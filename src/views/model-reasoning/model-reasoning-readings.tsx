import React, { useState } from "react";
import { PathwayReading } from "../../core/message-card/pathway-reading";
import { WordTooltipArea } from "../../core/message-card/word-tooltip";

/** The alien3 fit's three pathways, 0-based. The view checks that the fit has this many. */
export const PATHWAYS = [0, 1, 2];

interface ModelReasoningReadingsProps {
  /** messageWords(text) of the message shown. */
  words: string[];
  /** [word][pathway], or undefined while the scores load. */
  scores: number[][] | undefined;
  /** The scale maximum. */
  max: number;
}

/**
 * The message's three pathway readings, one under another in a scroller, with one tooltip for them
 * all. They share the current word, so Tab from one reading to the next lands on the same word. Key
 * this by the message, so a new message starts with no current word.
 *
 * docs/accessibility.md says why the scroller isn't a Tab stop of its own.
 */
export const ModelReasoningReadings: React.FC<ModelReasoningReadingsProps> = ({ words, scores, max }) => {
  const [current, setCurrent] = useState<number | undefined>(undefined);
  return (
    <WordTooltipArea className="model-reasoning__readings">
      <div className="model-reasoning__scroller">
        {PATHWAYS.map(pathway => (
          <PathwayReading key={pathway} pathway={pathway} words={words} scores={scores} max={max}
            current={current} onCurrentChange={setCurrent} />
        ))}
      </div>
    </WordTooltipArea>
  );
};
