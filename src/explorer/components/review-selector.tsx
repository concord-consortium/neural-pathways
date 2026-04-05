// src/explorer/components/review-selector.tsx
import React, { useMemo } from "react";
import Select, { SingleValue, StylesConfig } from "react-select";
import { S3Review } from "../../shared/types/s3-data";

interface ReviewSelectorProps {
  reviews: S3Review[];
  selectedReview?: S3Review;
  onSelect: (review: S3Review) => void;
}

const TRUNCATE_LENGTH = 60;

interface ReviewOption {
  value: string;
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

export const ReviewSelector: React.FC<ReviewSelectorProps> = ({ reviews, selectedReview, onSelect }) => {
  const options = useMemo<ReviewOption[]>(
    () => reviews.map((r, i) => ({
      value: r.id,
      label: `${i}: ${r.text.slice(0, TRUNCATE_LENGTH)}`,
      review: r,
    })),
    [reviews]
  );

  const selectedOption = useMemo(
    () => options.find(o => o.value === selectedReview?.id) ?? null,
    [options, selectedReview],
  );

  const handleChange = (option: SingleValue<ReviewOption>) => {
    if (option) {
      onSelect(option.review);
    }
  };

  return (
    <Select<ReviewOption>
      options={options}
      value={selectedOption}
      onChange={handleChange}
      placeholder="Search by review # or text..."
      isSearchable
      isClearable
      styles={selectStyles}
    />
  );
};
