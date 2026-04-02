import React, { useRef, useEffect } from "react";
import { ScaleType, ValueScaling, getPointStyle } from "../utils/color-scale";
import "./color-legend.scss";

interface ColorLegendProps {
  absMax: number;
  scaleType: ScaleType;
  valueScaling: ValueScaling;
  showStats?: boolean;
  width?: number;
  height?: number;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  absMax, scaleType, valueScaling, showStats, width = 200, height = 14
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (scaleType === "size-based") {
      const nDots = 20;
      const dotSpacing = width / nDots;
      const maxR = height / 2;
      for (let i = 0; i < nDots; i++) {
        const value = ((i / (nDots - 1)) * 2 - 1) * absMax;
        const style = getPointStyle(value, absMax, scaleType, valueScaling);
        const cx = i * dotSpacing + dotSpacing / 2;
        const cy = height / 2;
        const r = maxR * style.radiusScale;
        if (r > 0) {
          ctx.fillStyle = style.color;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      for (let x = 0; x < width; x++) {
        const value = ((x / (width - 1)) * 2 - 1) * absMax;
        const style = getPointStyle(value, absMax, scaleType, valueScaling);
        ctx.fillStyle = style.color;
        ctx.fillRect(x, 0, 1, height);
      }
    }
  }, [absMax, scaleType, valueScaling, width, height]);

  return (
    <div className="color-legend">
      <span className="color-legend-label">{showStats ? (-absMax).toFixed(2) : "cold"}</span>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="color-legend-bar"
      />
      <span className="color-legend-label">{showStats ? absMax.toFixed(2) : "hot"}</span>
    </div>
  );
};
