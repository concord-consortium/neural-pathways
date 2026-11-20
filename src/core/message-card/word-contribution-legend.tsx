import React from "react";
import { signedScore, spokenScore } from "./word-score-text";
import "./word-contribution-legend.scss";

interface WordContributionLegendProps {
  /** The largest absolute word score, which the ends of the bar stand for. */
  max: number;
}

/**
 * The key to the word colors: a bar from the most negative score through white to the most
 * positive. It is one image to a screen reader, named with the spoken range.
 */
export const WordContributionLegend: React.FC<WordContributionLegendProps> = ({ max }) => (
  <div
    className="word-contribution-legend"
    role="img"
    aria-label={`Word contribution, from ${spokenScore(-max)} to ${spokenScore(max)}`}
  >
    <span className="word-contribution-legend__caption">Word Contribution</span>
    <div className="word-contribution-legend__row">
      <span>{signedScore(-max)}</span>
      <span className="word-contribution-legend__bar" />
      <span>{signedScore(max)}</span>
    </div>
  </div>
);
