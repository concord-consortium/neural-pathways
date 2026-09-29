import React from "react";
import "./fill-bar.scss";

interface FillBarProps {
  value: number;
  maxValue: number;
  label?: string;
  className?: string;
  testId?: string;
}

export const FillBar: React.FC<FillBarProps> = ({ value, maxValue, label, className, testId }) => {
  const widthPercent = Math.min((Math.abs(value) / maxValue) * 100, 100);

  return (
    <div className={`fill-bar ${className ?? ""}`}>
      <div className="fill-bar-track">
        <div
          className="fill-bar-fill"
          data-testid={testId}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {label && <span className="fill-bar-label">{label}</span>}
    </div>
  );
};
