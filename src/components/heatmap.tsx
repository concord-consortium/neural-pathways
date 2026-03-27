import React, { useRef, useEffect } from "react";
import { valueToColor } from "../utils/color-scale";
import "./heatmap.scss";

const COLS = 26;
const ROWS = 30;

interface HeatmapProps {
  data: number[];
  absMax: number;
  label?: string;
  size?: number; // width of the canvas in pixels; height scales proportionally
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, absMax, label, size = 130 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cellSize = size / COLS;
  const canvasWidth = size;
  const canvasHeight = Math.round(cellSize * ROWS);
  const radius = cellSize / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < data.length && i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = col * cellSize + radius;
      const cy = row * cellSize + radius;

      ctx.fillStyle = valueToColor(data[i], absMax);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, absMax, canvasWidth, canvasHeight, cellSize, radius]);

  return (
    <div className="heatmap-container">
      {label && <div className="heatmap-label">{label}</div>}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="heatmap-canvas"
      />
    </div>
  );
};
