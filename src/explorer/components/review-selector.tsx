// src/explorer/components/review-selector.tsx
import React, { useMemo } from "react";
import Select, { SingleValue, StylesConfig } from "react-select";
import { ExplorerReview } from "../types/explorer-data";

interface ReviewSelectorProps {
  reviews: ExplorerReview[];
  onSelect: (review: ExplorerReview) => void;
}

const TRUNCATE_LENGTH = 60;

interface ReviewOption {
  value: number;
  label: string;
  review: ExplorerReview;
}

const selectStyles: StylesConfig<ReviewOption, false> = {
  container: (base) => ({ ...base, flex: 1, minWidth: 0 }),
  control: (base) => ({ ...base, flexWrap: "nowrap" }),
  valueContainer: (base) => ({ ...base, overflow: "hidden", flexWrap: "nowrap" }),
  singleValue: (base) => ({ ...base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  input: (base) => ({ ...base, flex: "1 1 auto" }),
};

export const ReviewSelector: React.FC<ReviewSelectorProps> = ({ reviews, onSelect }) => {
  const options = useMemo<ReviewOption[]>(
    () => reviews.map(r => ({
      value: r.index,
      label: `${r.index}: ${r.text.slice(0, TRUNCATE_LENGTH)}`,
      review: r,
    })),
    [reviews]
  );

  const handleChange = (option: SingleValue<ReviewOption>) => {
    if (option) {
      onSelect(option.review);
    }
  };

  return (
    <Select<ReviewOption>
      options={options}
      onChange={handleChange}
      placeholder="Search by review # or text..."
      isSearchable
      isClearable
      styles={selectStyles}
    />
  );
};
