import React, { useRef, useEffect } from "react";
import { ScaleType, getPointStyle } from "../utils/color-scale";
import "./heatmap.scss";

const COLS = 26;
const ROWS = 30;

interface HeatmapProps {
  data: number[];
  absMax: number;
  scaleType: ScaleType;
  label?: string;
  size?: number; // CSS width of the canvas in pixels; height scales proportionally
}

export const Heatmap: React.FC<HeatmapProps> = ({ data, absMax, scaleType, label, size = 130 }) => {
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let i = 0; i < data.length && i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = col * cellSize + radius;
      const cy = row * cellSize + radius;

      const style = getPointStyle(data[i], absMax, scaleType);
      const pointRadius = radius * 0.85 * style.radiusScale;

      if (pointRadius > 0) {
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(cx, cy, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [data, absMax, scaleType, canvasWidth, canvasHeight, cellSize, radius]);

  return (
    <div className="heatmap-container">
      {label && <div className="heatmap-label">{label}</div>}
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height: canvasHeight }}
        className="heatmap-canvas"
      />
    </div>
  );
};
