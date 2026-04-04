import React, { useMemo } from "react";
import Select, { SingleValue, StylesConfig } from "react-select";
import { S3Review } from "../types/viz-data";
import "./review-panel.scss";

const TRUNCATE_LENGTH = 60;

interface ReviewOption {
  value: string; // review id
  label: string;
  review: S3Review;
}

const selectStyles: StylesConfig<ReviewOption, false> = {
  container: (base) => ({ ...base, flex: 1, minWidth: 0 }),
  control: (base) => ({ ...base, flexWrap: "nowrap" }),
  valueContainer: (base) => ({ ...base, overflow: "hidden", flexWrap: "nowrap" }),
  singleValue: (base) => ({ ...base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  input: (base) => ({ ...base, flex: "1 1 auto" }),
};

interface ReviewPanelProps {
  reviews: S3Review[];
  selectedReview: S3Review | undefined;
  onSelectReview: (review: S3Review) => void;
  activationsLoading: boolean;
  children?: React.ReactNode;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  reviews, selectedReview, onSelectReview, activationsLoading, children,
}) => {
  const options = useMemo<ReviewOption[]>(
    () => reviews.map((r, i) => ({
      value: r.id,
      label: `${i}: ${r.text.slice(0, TRUNCATE_LENGTH)}`,
      review: r,
    })),
    [reviews],
  );

  const selectedOption = useMemo(
    () => options.find(o => o.value === selectedReview?.id) ?? null,
    [options, selectedReview],
  );

  const handleChange = (option: SingleValue<ReviewOption>) => {
    if (option) {
      onSelectReview(option.review);
    }
  };

  return (
    <div className="review-panel">
      <Select<ReviewOption>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder="Search by review # or text..."
        isSearchable
        isClearable
        styles={selectStyles}
      />

      {selectedReview && (
        <>
          <div className={`review-sentiment ${selectedReview.target_label ?? ""}`}>
            Sentiment: {selectedReview.target_label ?? "unknown"}
          </div>

          {selectedReview.sources && (
            <div className="review-source">
              Source: {Object.keys(selectedReview.sources).join(", ")}
            </div>
          )}

          {selectedReview.name && (
            <div className="review-source">
              {selectedReview.name}{selectedReview.city ? `, ${selectedReview.city}` : ""}
              {selectedReview.state ? `, ${selectedReview.state}` : ""}
              {selectedReview.review_stars != null ? ` — ${selectedReview.review_stars} stars` : ""}
            </div>
          )}

          <div className="review-text">{selectedReview.text}</div>

          {activationsLoading && (
            <div className="review-loading">Loading activations...</div>
          )}
        </>
      )}

      {children}
    </div>
  );
};
