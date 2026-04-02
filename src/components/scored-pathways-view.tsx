import React, { useState, useCallback, useRef, useMemo } from "react";
import { Heatmap } from "./heatmap";
import { ScaleType, ValueScaling } from "../utils/color-scale";
import "./scored-pathways-view.scss";

const HEATMAP_WIDTH = 130;
const CELL_SIZE = HEATMAP_WIDTH / 26;
const HEATMAP_HEIGHT = Math.round(CELL_SIZE * 30);
const GAP = 20;
const HEATMAP_ROTATION_DEG = 80;
const HEATMAP_ROTATION_RAD = HEATMAP_ROTATION_DEG * Math.PI / 180;
const COS_HEATMAP = Math.cos(HEATMAP_ROTATION_RAD);
const SIN_HEATMAP = Math.sin(HEATMAP_ROTATION_RAD);
const CAMERA_ORBIT_DEG = 45;
const PERSPECTIVE = 1200;
const ANIMATION_DURATION_MS = 6000;

interface ScoredPathwaysViewProps {
  scoredPathways: number[][];
  absMax: number;
  scaleType: ScaleType;
  valueScaling: ValueScaling;
  showStats: boolean;
  legend?: React.ReactNode;
}

const NUM_PHASES = 5;
const PHASE_DURATION = 1 / NUM_PHASES;

function phaseProgress(progress: number, phase: number): number {
  const phaseStart = phase * PHASE_DURATION;
  return Math.max(0, Math.min(1, (progress - phaseStart) / PHASE_DURATION));
}

export const ScoredPathwaysView: React.FC<ScoredPathwaysViewProps> = ({
  scoredPathways, absMax, scaleType, valueScaling, showStats, legend
}) => {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startProgressRef = useRef(0);

  const n = scoredPathways.length;
  const totalWidth = n * HEATMAP_WIDTH + (n - 1) * GAP;
  const xCenter = totalWidth / 2;

  // Pre-compute the slide amounts for phase 3.
  // Each heatmap slides along its rotated plane so all centers lie on a line
  // perpendicular to the heatmap planes. P6 stays fixed, others slide toward it.
  // dx_i = (centerX_last - centerX_i) * cos(HEATMAP_ROTATION)
  const slideAmounts = useMemo(() => {
    const last = n - 1;
    const centerXLast = last * (HEATMAP_WIDTH + GAP) + HEATMAP_WIDTH / 2;

    return Array.from({ length: n }, (_, i) => {
      const centerX_i = i * (HEATMAP_WIDTH + GAP) + HEATMAP_WIDTH / 2;
      return (centerXLast - centerX_i) * COS_HEATMAP;
    });
  }, [n]);

  const play = useCallback(() => {
    if (animRef.current) return;
    setIsPlaying(true);
    startTimeRef.current = null;
    startProgressRef.current = progress;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const remaining = (1 - startProgressRef.current) * ANIMATION_DURATION_MS;
      const newProgress = Math.min(1, startProgressRef.current + elapsed / ANIMATION_DURATION_MS);
      setProgress(newProgress);

      if (elapsed < remaining) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(1);
        setIsPlaying(false);
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [progress]);

  const pause = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    pause();
    setProgress(Number(e.target.value) / 1000);
  }, [pause]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      if (progress >= 1) setProgress(0);
      play();
    }
  }, [isPlaying, progress, play, pause]);

  // Phase progress values (each phase is 0-1 within its portion of the overall 0-1 range)
  const t1 = phaseProgress(progress, 0); // Phase 1: rotate heatmaps, fade + signs
  const t2 = phaseProgress(progress, 1); // Phase 2: camera orbits
  const t3 = phaseProgress(progress, 2); // Phase 3: slide to converge
  const t4 = phaseProgress(progress, 3); // Phase 4: depth convergence
  const t5 = phaseProgress(progress, 4); // Phase 5: rotate sandwich to face camera

  // Phase 1: heatmaps rotate, + signs fade
  const plusOpacity = 1 - t1;

  // Phase 5: rotate everything back to face the camera
  // Heatmap rotation: 0 → HEATMAP_ROTATION (phase 1), then HEATMAP_ROTATION → 0 (phase 5)
  const heatmapRotation = t1 * HEATMAP_ROTATION_DEG - t5 * HEATMAP_ROTATION_DEG;
  // Camera orbit: 0 → -CAMERA_ORBIT (phase 2), then -CAMERA_ORBIT → 0 (phase 5)
  const containerRotation = -t2 * CAMERA_ORBIT_DEG + t5 * CAMERA_ORBIT_DEG;

  // Phase 4: progressively merge heatmap data back-to-front.
  // At t4=0: each heatmap shows its own data.
  // At t4=1: each heatmap shows the cumulative sum of itself + all behind it.
  const mergedData = useMemo(() => {
    if (t4 <= 0) return scoredPathways;

    const result: number[][] = new Array(n);
    result[0] = scoredPathways[0]; // P1 (furthest back) stays as-is
    for (let i = 1; i < n; i++) {
      const prev = result[i - 1];
      const curr = scoredPathways[i];
      result[i] = curr.map((v, j) => v + t4 * prev[j]);
    }
    return result;
  }, [scoredPathways, t4, n]);

  const lastIdx = n - 1;
  const lastLeftX = lastIdx * (HEATMAP_WIDTH + GAP);

  const getHeatmapStyle = (i: number) => {
    const originalLeftX = i * (HEATMAP_WIDTH + GAP);
    const dx = slideAmounts[i];

    // Phase 3: slide along the rotated plane
    // World displacement from local slide dx: (dx*COS_HEATMAP, 0, -dx*SIN_HEATMAP)
    const slideX = t3 * dx * COS_HEATMAP;
    const slideZ = -t3 * dx * SIN_HEATMAP;

    // Phase 3 end position (in container local space)
    const phase3EndX = originalLeftX + dx * COS_HEATMAP;
    const phase3EndZ = -dx * SIN_HEATMAP;

    // Phase 4: lerp from phase-3-end position to P6's position
    let worldX: number;
    let worldZ: number;

    if (t4 > 0) {
      worldX = phase3EndX + (lastLeftX - phase3EndX) * t4;
      worldZ = phase3EndZ + (0 - phase3EndZ) * t4;
    } else {
      worldX = originalLeftX + slideX;
      worldZ = slideZ;
    }

    return {
      transform: `translate3d(${worldX}px, 0, ${worldZ}px) rotateY(${heatmapRotation}deg)`,
      transformOrigin: `${HEATMAP_WIDTH / 2}px ${HEATMAP_HEIGHT / 2}px`,
    };
  };

  return (
    <div className="scored-pathways-section">
      <div className="scored-pathways-label">
        Scored pathways (pattern x score)
        {legend && <span className="scored-pathways-legend">{legend}</span>}
      </div>

      <div className="animation-controls">
        <button className="play-pause-btn" onClick={handlePlayPause}>
          {isPlaying ? "\u23F8" : "\u25B6"}
        </button>
        <input
          type="range"
          className="animation-scrubber"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={handleScrub}
        />
      </div>

      <div
        className="scored-pathways-3d-container"
        style={{
          width: totalWidth,
          height: HEATMAP_HEIGHT + (showStats ? 50 : 0),
          perspective: PERSPECTIVE,
          perspectiveOrigin: `${xCenter}px ${HEATMAP_HEIGHT / 2}px`,
        }}
      >
        <div
          className="scored-pathways-scene"
          style={{
            width: totalWidth,
            height: HEATMAP_HEIGHT + (showStats ? 50 : 0),
            transform: `rotateY(${containerRotation}deg)`,
            transformOrigin: `${xCenter}px ${HEATMAP_HEIGHT / 2}px`,
          }}
        >
          {mergedData.map((data, i) => {
            const style = getHeatmapStyle(i);
            return (
              <div
                key={`scored-${i}`}
                className="scored-pathway-item"
                style={style}
              >
                <Heatmap
                  data={data} absMax={absMax} scaleType={scaleType}
                  valueScaling={valueScaling} showStats={showStats}
                />
              </div>
            );
          })}

          {/* + operators between heatmaps */}
          {Array.from({ length: n - 1 }, (_, i) => {
            const x = i * (HEATMAP_WIDTH + GAP) + HEATMAP_WIDTH;
            return (
              <div
                key={`op-${i}`}
                className="scored-pathway-operator"
                style={{
                  left: x,
                  width: GAP,
                  height: HEATMAP_HEIGHT,
                  opacity: plusOpacity,
                }}
              >
                +
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
