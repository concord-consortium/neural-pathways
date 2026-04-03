import React from "react";
import { ExplorerReview } from "../types/explorer-data";
import "./review-panel.scss";

interface ReviewPanelProps {
  review: ExplorerReview;
}

const Stars: React.FC<{ count: number; testId?: string }> = ({ count, testId }) => {
  const filled = Math.round(count);
  return (
    <span className="explorer-stars" data-testid={testId}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
};

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ review }) => {
  return (
    <div className="explorer-review-panel">
      <div className="explorer-review-meta">
        <Stars count={review.review_stars} testId="review-stars" />
        <span className={`explorer-review-badge badge-${review.target_label}`}>
          {review.target_label}
        </span>
        <span className="explorer-review-badge badge-source">
          {review.source}
        </span>
      </div>

      <div className="explorer-review-text">{review.text}</div>

      <div className="explorer-review-business">
        <strong>{review.name}</strong> · {review.city}, {review.state}
      </div>

      {review.categories && (
        <div className="explorer-review-categories">{review.categories}</div>
      )}

      <div className="explorer-review-stats">
        <span className="explorer-review-business-stars">
          Business rating: <Stars count={review.stars} />
        </span>
      </div>

      <div className="explorer-review-r2">
        Reconstruction R²: <span className="r2-value">{review.reconstruction_r2.toFixed(4)}</span>
      </div>
    </div>
  );
};
