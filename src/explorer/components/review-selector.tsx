// src/explorer/components/review-selector.tsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ExplorerReview } from "../types/explorer-data";
import "./review-selector.scss";

interface ReviewSelectorProps {
  reviews: ExplorerReview[];
  onSelect: (review: ExplorerReview) => void;
}

const MAX_RESULTS = 50;
const TRUNCATE_LENGTH = 60;

export const ReviewSelector: React.FC<ReviewSelectorProps> = ({ reviews, onSelect }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const matches = reviews.filter(r => {
      const indexStr = String(r.index);
      if (indexStr.includes(query)) return true;
      if (r.text.toLowerCase().includes(lower)) return true;
      return false;
    });
    return matches.slice(0, MAX_RESULTS);
  }, [query, reviews]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (review: ExplorerReview) => {
    setQuery(`#${review.index} ${review.text.slice(0, TRUNCATE_LENGTH)}`);
    setIsOpen(false);
    onSelect(review);
  };

  return (
    <div className="review-selector" ref={containerRef}>
      <input
        className="review-selector-input"
        placeholder="Search by review # or text..."
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => { if (query.trim()) setIsOpen(true); }}
      />
      {isOpen && filtered.length > 0 && (
        <div className="review-selector-dropdown">
          {filtered.map(r => (
            <div
              key={r.index}
              className="review-selector-item"
              onClick={() => handleSelect(r)}
            >
              <span className="review-selector-index">#{r.index}</span>
              {r.text.slice(0, TRUNCATE_LENGTH)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
