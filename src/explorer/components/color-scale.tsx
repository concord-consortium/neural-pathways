import React from "react";
import { WordColorMode } from "../types/explorer-data";
import "./color-scale.scss";

interface ColorScaleProps {
  maxAbsValue: number;
  wordColorMode: WordColorMode;
}

function formatEndpoint(value: number, mode: WordColorMode): string {
  if (mode === "impact") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(4);
}

export const ColorScale: React.FC<ColorScaleProps> = ({ maxAbsValue, wordColorMode }) => {
  if (maxAbsValue === 0) return null;

  return (
    <div className="color-scale">
      <span className="color-scale-label">{formatEndpoint(-maxAbsValue, wordColorMode)}</span>
      <div className="color-scale-bar" />
      <span className="color-scale-label">{formatEndpoint(maxAbsValue, wordColorMode)}</span>
    </div>
  );
};
