import React, { useRef, useEffect, useMemo } from "react";
import { ScaleType, ValueScaling, getPointStyle } from "../../shared/color-scale";
import "./heatmap.scss";

/**
 * Choose grid dimensions for n items, aiming for a roughly square grid
 * that is slightly taller than wide.
 */
function gridDimensions(n: number): { cols: number; rows: number } {
  const cols = Math.round(Math.sqrt(n * 0.85));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

interface HeatmapProps {
  data: number[];
  absMax: number;
  scaleType: ScaleType;
  valueScaling?: ValueScaling;
  showStats?: boolean;
  label?: string;
  size?: number; // CSS width of the canvas in pixels; height scales proportionally
  formatStat?: (value: number) => number;
}

export const Heatmap: React.FC<HeatmapProps> = ({
  data, absMax, scaleType, valueScaling = "linear", showStats, label, size = 130,
  formatStat,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { cols, rows } = useMemo(() => gridDimensions(data.length), [data.length]);
  const cellSize = size / cols;
  const canvasWidth = size;
  const canvasHeight = Math.round(cellSize * rows);
  const radius = cellSize / 2;

  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const localAbsMax = Math.max(Math.abs(min), Math.abs(max));
    return { min, max, absMax: localAbsMax };
  }, [data]);

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

    for (let i = 0; i < data.length && i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = col * cellSize + radius;
      const cy = row * cellSize + radius;

      const style = getPointStyle(data[i], absMax, scaleType, valueScaling);
      const pointRadius = radius * 0.85 * style.radiusScale;

      if (pointRadius > 0) {
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(cx, cy, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [data, absMax, scaleType, valueScaling, canvasWidth, canvasHeight, cellSize, radius, cols, rows]);

  return (
    <div className="heatmap-container">
      {label && <div className="heatmap-label">{label}</div>}
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height: canvasHeight }}
        className="heatmap-canvas"
      />
      {showStats && (
        <div className="heatmap-stats">
          <div>min: {(formatStat?.(stats.min) ?? stats.min).toFixed(3)}</div>
          <div>max: {(formatStat?.(stats.max) ?? stats.max).toFixed(3)}</div>
          <div>
            absMax: {(formatStat
              ? Math.max(
                Math.abs(formatStat(stats.min)),
                Math.abs(formatStat(stats.max))
              )
              : stats.absMax
            ).toFixed(3)}
          </div>
        </div>
      )}
    </div>
  );
};
