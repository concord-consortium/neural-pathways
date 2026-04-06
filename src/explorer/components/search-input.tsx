import React from "react";
import "./search-input.scss";

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
  hasError?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  query, onQueryChange, resultCount, totalCount, hasError,
}) => {
  return (
    <div className={`search-input-container${hasError ? " search-input-error" : ""}`}>
      <input
        className="search-input-field"
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder='stars:5 AND pathway_0:>0.8'
      />
      <span className="search-input-count">
        {resultCount} of {totalCount}
      </span>
    </div>
  );
};
