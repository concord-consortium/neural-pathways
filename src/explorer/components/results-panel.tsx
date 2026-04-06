import React, { useState } from "react";
import { S3Review } from "../../shared/types/s3-data";
import "./results-panel.scss";

const SNIPPET_LENGTH = 80;

interface ResultsPanelProps {
  reviews: S3Review[];
  fitName: string;
  selectedReviewId: string | null;
  onSelectReview: (review: S3Review) => void;
  maxAbsScore: number;
  resultCount: number;
  totalCount: number;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  reviews, fitName, selectedReviewId, onSelectReview, maxAbsScore, resultCount, totalCount,
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
        <span className="results-panel-count">{resultCount} of {totalCount}</span>
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
              <div className="results-panel-card-bars">
                {scores.map((score, i) => {
                  const pct = maxAbsScore > 0 ? (Math.abs(score) / maxAbsScore) * 100 : 0;
                  const color = score >= 0 ? "#e74c3c" : "#3498db";
                  return (
                    <div key={i} className="results-panel-bar-col">
                      <div className="results-panel-bar" style={{
                        height: `${pct}%`,
                        backgroundColor: color,
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
