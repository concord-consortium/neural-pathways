import React from "react";
import "./pathway-score-input.scss";

interface PathwayScoreInputProps {
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
}

export const PathwayScoreInput: React.FC<PathwayScoreInputProps> = ({
  value, originalValue, onChange
}) => {
  const isModified = value !== originalValue;

  return (
    <div className="pathway-score-input">
      <input
        type="number"
        className="score-number-input"
        value={Number(value.toFixed(3))}
        step={0.01}
        onChange={e => onChange(Number(e.target.value))}
      />
      <input
        type="range"
        className="score-slider"
        min={-3}
        max={3}
        step={0.01}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      {isModified && (
        <button
          className="score-reset-btn"
          onClick={() => onChange(originalValue)}
        >
          reset
        </button>
      )}
    </div>
  );
};
