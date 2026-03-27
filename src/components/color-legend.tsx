import React, { useRef, useEffect } from "react";
import { valueToColor } from "../utils/color-scale";
import "./color-legend.scss";

interface ColorLegendProps {
  absMax: number;
  width?: number;
  height?: number;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  absMax, width = 200, height = 14
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let x = 0; x < width; x++) {
      const value = ((x / (width - 1)) * 2 - 1) * absMax; // -absMax to +absMax
      ctx.fillStyle = valueToColor(value, absMax);
      ctx.fillRect(x, 0, 1, height);
    }
  }, [absMax, width, height]);

  return (
    <div className="color-legend">
      <span className="color-legend-label">cold</span>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="color-legend-bar"
      />
      <span className="color-legend-label">hot</span>
    </div>
  );
};
