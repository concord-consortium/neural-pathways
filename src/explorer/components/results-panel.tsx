import React, { useState } from "react";
import { S3Item } from "../../shared/types/s3-data";
import "./results-panel.scss";

const SNIPPET_LENGTH = 80;

interface ResultsPanelProps {
  items: S3Item[];
  fitName: string;
  selectedItemId: string | null;
  onSelectItem: (item: S3Item) => void;
  maxAbsScore: number;
  resultCount: number;
  totalCount: number;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  items, fitName, selectedItemId, onSelectItem, maxAbsScore, resultCount, totalCount,
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
        {items.map(item => {
          const scores = item.pathway_scores[fitName] ?? [];
          const isSelected = item.id === selectedItemId;
          return (
            <div
              key={item.id}
              className={`results-panel-card${isSelected ? " selected" : ""}`}
              onClick={() => onSelectItem(item)}
              data-testid="result-card"
            >
              <div className="results-panel-card-text">
                {item.text.slice(0, SNIPPET_LENGTH)}
                {item.text.length > SNIPPET_LENGTH ? "..." : ""}
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
