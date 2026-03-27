import React from "react";
import { Review } from "../types/viz-data";
import "./review-panel.scss";

interface ReviewPanelProps {
  reviews: Review[];
  selectedIndex: number;
  onSelectReview: (index: number) => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  reviews, selectedIndex, onSelectReview
}) => {
  const review = reviews[selectedIndex];

  return (
    <div className="review-panel">
      <select
        className="review-selector"
        value={selectedIndex}
        onChange={e => onSelectReview(Number(e.target.value))}
      >
        {reviews.map((r, i) => (
          <option key={r.index} value={i}>
            Review {i + 1}: {r.text.slice(0, 40)}...
          </option>
        ))}
      </select>

      <div className={`review-sentiment ${review.target_label}`}>
        Sentiment: {review.target_label}
      </div>

      <div className="review-text">{review.text}</div>

    </div>
  );
};
