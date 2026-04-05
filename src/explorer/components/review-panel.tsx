import React from "react";
import { S3Review } from "../../shared/types/s3-data";
import "./review-panel.scss";

interface ReviewPanelProps {
  review: S3Review;
  reconstructionR2: number | null;
}

const Stars: React.FC<{ count: number; testId?: string }> = ({ count, testId }) => {
  const filled = Math.round(count);
  return (
    <span className="explorer-stars" data-testid={testId}>
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
};

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ review, reconstructionR2 }) => {
  return (
    <div className="explorer-review-panel">
      <div className="explorer-review-meta">
        {review.review_stars != null && (
          <Stars count={review.review_stars} testId="review-stars" />
        )}
        {review.target_label && (
          <span className={`explorer-review-badge badge-${review.target_label}`}>
            {review.target_label}
          </span>
        )}
        <span className="explorer-review-badge badge-source">
          {Object.keys(review.sources).join(", ")}
        </span>
      </div>

      <div className="explorer-review-text">{review.text}</div>

      {review.name && (
        <div className="explorer-review-business">
          <strong>{review.name}</strong>
          {review.city && <> · {review.city}{review.state && `, ${review.state}`}</>}
        </div>
      )}

      {review.categories && (
        <div className="explorer-review-categories">{review.categories}</div>
      )}

      {review.stars != null && (
        <div className="explorer-review-stats">
          <span className="explorer-review-business-stars">
            Business rating: <Stars count={review.stars} />
          </span>
        </div>
      )}

      {reconstructionR2 != null && (
        <div className="explorer-review-r2">
          Reconstruction R²: <span className="r2-value">{reconstructionR2.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
};
