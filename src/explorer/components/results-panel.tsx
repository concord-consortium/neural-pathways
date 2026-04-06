import React, { useState } from "react";
import { S3Review } from "../../shared/types/s3-data";
import "./results-panel.scss";

const SNIPPET_LENGTH = 80;

interface ResultsPanelProps {
  reviews: S3Review[];
  fitName: string;
  selectedReviewId: string | null;
  onSelectReview: (review: S3Review) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  reviews, fitName, selectedReviewId, onSelectReview,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="results-panel collapsed">
        <button
          className="results-panel-toggle"
          onClick={() => setCollapsed(false)}
          aria-label="Expand results"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <div className="results-panel-header">
        <span className="results-panel-title">Results</span>
        <button
          className="results-panel-toggle"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse results"
        >
          ◀
        </button>
      </div>
      <div className="results-panel-list">
        {reviews.map(review => {
          const scores = review.pathway_scores[fitName] ?? [];
          const isSelected = review.id === selectedReviewId;
          return (
            <div
              key={review.id}
              className={`results-panel-card${isSelected ? " selected" : ""}`}
              onClick={() => onSelectReview(review)}
            >
              <div className="results-panel-card-text">
                {review.text.slice(0, SNIPPET_LENGTH)}
                {review.text.length > SNIPPET_LENGTH ? "..." : ""}
              </div>
              <div className="results-panel-card-scores">
                {scores.map((score, i) => (
                  <span key={i} className="results-panel-score-badge">
                    P{i}: {score.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
