import React, { useLayoutEffect, useMemo, useRef } from "react";
import { RULE_COLOR, signColor } from "../../core/colors";
import { ForwardPass } from "../../core/network/forward";
import { cubicBezier } from "../../core/network-diagram/easing";
import { ExtractGeometry } from "./extract-geometry";
import { PathwaysScene } from "./extract-scene";
import { easeX } from "./flight";
import { faceSources, PARTICLE_R, particleAt, particlePlan, particleTarget, SOURCE_STEP } from "./particles";
import { BAR_HEIGHT, BOX_SIDE, LABEL_GAP, PathwaysLayout } from "./pathways-layout";
import { COPY_END_SCALE } from "./pathways-timeline";

/** The box's kick (the prototype's d1a-boxkick): keyframes of time and scale, each eased. */
const KICK_KEYFRAMES: readonly [number, number][] = [[0, 1], [0.38, 1.1], [0.7, 0.98], [1, 1]];
const kickEase = cubicBezier(0.34, 1.1, 0.5, 1);
const BOX_CORNER = 6;

/** `from` mixed toward `to` by `t`, both #RRGGBB; exactly each at 0 and 1. */
export function mixColor(from: string, to: string, t: number): string {
  if (t <= 0) {
    return from;
  }
  if (t >= 1) {
    return to;
  }
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const mixed = [0, 1, 2].map(i => Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t));
  return `#${mixed.map(c => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** A box's scale `p` of the way through its kick. */
export function kickScale(p: number): number {
  for (let i = 1; i < KICK_KEYFRAMES.length; i++) {
    const [at, scale] = KICK_KEYFRAMES[i];
    const [was, from] = KICK_KEYFRAMES[i - 1];
    if (p <= at) {
      return from + (scale - from) * kickEase((p - was) / (at - was));
    }
  }
  return 1;
}

/** Applies `transform` to an SVG element about its own center. */
const aboutCenter = (transform: string): React.CSSProperties =>
  ({ transformBox: "fill-box", transformOrigin: "center", transform });

/**
 * The lines, the zero rules, the loading bars, the boxes with their labels, and the bar copies
 * in flight, bottom to top, as `pathways` says. Nothing until the particles start.
 */
export function PathwaysLayer({ pathways, layout }: { pathways: PathwaysScene; layout: PathwaysLayout }) {
  const { bars } = pathways;
  if (!bars) {
    return null;
  }
  const { flying } = pathways;
  return (
    <g data-testid="pathways">
      {pathways.lines > 0 && (
        <g data-testid="pathway-lines" opacity={pathways.lines < 1 ? pathways.lines : undefined}>
          {layout.bars.map((bar, b) => {
            const box = layout.boxes[bar.pathway];
            return (
              <line key={b} data-testid="pathway-line" className="extract-drawing__line"
                x1={bar.zero} y1={bar.y} x2={box.x} y2={box.cy} />
            );
          })}
        </g>
      )}
      {layout.rules.map((rule, k) => (
        <line key={k} data-testid="zero-rule" className="extract-drawing__zero"
          x1={rule.x} y1={rule.y1} x2={rule.x} y2={rule.y2} />
      ))}
      {layout.bars.map((bar, b) => {
        const width = bar.length * bars[b].grown;
        return (
          <rect key={b} data-testid="loading-bar" x={bar.loading >= 0 ? bar.zero : bar.zero - width}
            y={bar.y - BAR_HEIGHT / 2} width={width} height={BAR_HEIGHT}
            fill={mixColor(signColor(bar.loading), RULE_COLOR, bars[b].muted)} />
        );
      })}
      {layout.boxes.map((box, p) => {
        const { opacity, kick } = pathways.boxes[p];
        return opacity > 0 && (
          <g key={p} data-testid="pathway-box" opacity={opacity < 1 ? opacity : undefined}>
            <rect className="extract-drawing__box" x={box.x} y={box.cy - BOX_SIDE / 2} width={BOX_SIDE}
              height={BOX_SIDE} rx={BOX_CORNER}
              style={kick === undefined ? undefined : aboutCenter(`scale(${kickScale(kick)})`)} />
            <text className="extract-drawing__label extract-drawing__pathway" x={box.x + BOX_SIDE + LABEL_GAP}
              y={box.cy + 4}>
              {`Pathway ${p + 1}`}
            </text>
          </g>
        );
      })}
      {flying?.copies.map((copy, neuron) => {
        const bar = layout.bars[neuron * layout.boxes.length + flying.pathway];
        const box = layout.boxes[flying.pathway];
        const middle = bar.zero + (bar.loading >= 0 ? bar.length / 2 : -bar.length / 2);
        const e = easeX(copy.progress);
        const dx = (box.x + BOX_SIDE / 2 - middle) * e;
        const dy = (box.cy - bar.y) * e;
        const scale = 1 + (COPY_END_SCALE - 1) * e;
        return copy.opacity > 0 && (
          <rect key={neuron} data-testid="bar-copy" x={middle - bar.length / 2} y={bar.y - BAR_HEIGHT / 2}
            width={bar.length} height={BAR_HEIGHT} fill={signColor(bar.loading)}
            opacity={copy.opacity < 1 ? copy.opacity : undefined}
            style={aboutCenter(`translate(${dx}px, ${dy}px) scale(${scale})`)} />
        );
      })}
    </g>
  );
}

interface ParticleCanvasProps {
  /** Timeline time into the particles' flight. */
  t: number;
  geometry: ExtractGeometry;
  passes: readonly ForwardPass[];
  size: number;
  layout: PathwaysLayout;
}

/**
 * The particle canvas: the particles in flight, painted on a `<canvas>` over the SVG at the device's
 * pixel ratio. A `<canvas>`, because 1,500 dots moving every frame are too many SVG elements to
 * update; they carry no text, so it loses nothing. Hidden from screen readers: the drawing's
 * description covers it.
 */
export function ParticleCanvas({ t, geometry, passes, size, layout }: ParticleCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sources = useMemo(() => faceSources(geometry, passes, size), [geometry, passes, size]);
  const { width, height } = geometry;
  useLayoutEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (sources.length === 0) {
      return;
    }
    const { particles, need } = particlePlan();
    for (const particle of particles) {
      const source = sources[(particle.order * SOURCE_STEP) % sources.length];
      const target = particleTarget(particle, layout.bars[particle.bar], need[particle.bar]);
      const placed = particleAt(particle, t, source, target);
      if (!placed) {
        continue;
      }
      context.globalAlpha = placed.opacity;
      context.fillStyle = source.color;
      context.beginPath();
      context.arc(placed.x, placed.y, PARTICLE_R, 0, 2 * Math.PI);
      context.fill();
    }
  }, [t, sources, layout, width, height]);
  return (
    <canvas ref={ref} data-testid="particles" aria-hidden="true" className="extract-drawing__particles"
      style={{ width, height }} />
  );
}
