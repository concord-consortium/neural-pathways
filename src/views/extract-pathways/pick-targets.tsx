import React, { useRef, useState } from "react";
import { ColumnGeometry } from "./extract-geometry";
import { BOX_SIDE, PathwaysLayout } from "./pathways-layout";
import { BOX_CORNER, PICK_RING_GAP } from "./pathways-drawing";
import { Pick, samePick, togglePick } from "./pick";
import "./pick-targets.scss";

/** The tip, a line to an entry. It also names the targets, since it says what they are for. */
export const TIP_LINES = ["Click a neuron or", "a neural pathway to see", "how they are linked."] as const;

/** Each neuron's target is this much wider than its circle, half each side. */
const TARGET_EXTRA_WIDTH = 10;
/** How far outside a neuron its focus ring is drawn: outside the pick ring, so both show. */
const FOCUS_RING_GAP = 6.5;
/**
 * How far outside a box its focus outline's path runs. Its 2 px stroke then starts 2 px outside the
 * box, clear of the picked outline, which reaches 1.5 px outside.
 */
const FOCUS_BOX_GAP = 3;
/** The tip's room from its left edge to the canvas's right edge, and how far left of that it starts. */
const TIP_ROOM = 186;
const TIP_INSET = 5;
const TIP_FIRST_BASELINE = 30;
const TIP_LINE_HEIGHT = 16;

/**
 * Where a key moves within a group of `count`, from `index`: up or down one, stopping at the ends,
 * or to the first or last. Undefined when the key doesn't move, so the page keeps it.
 */
export function stepAfterKey(index: number, key: string, count: number): number | undefined {
  switch (key) {
    case "ArrowUp":
      return index > 0 ? index - 1 : undefined;
    case "ArrowDown":
      return index < count - 1 ? index + 1 : undefined;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}

interface PickTargetsProps {
  width: number;
  height: number;
  lifted: ColumnGeometry;
  layout: PathwaysLayout;
  /** The lifted neurons' names, as their copies give them. */
  names: readonly string[];
  pick: Pick;
  onPick(next: Pick): void;
}

/**
 * The pick targets and the tip, on a transparent SVG over the drawing, so the drawing keeps its
 * description. The 14 lifted neurons are one Tab stop and the three pathway boxes another (a roving
 * tabindex each); the arrow keys, Home and End move within a group, Enter and Space toggle, and
 * Escape clears. Hover and keyboard focus are drawn here, by CSS, so a click leaves no focus ring; the
 * pick itself is drawn by `PathwaysLayer`.
 */
export function PickTargets({ width, height, lifted, layout, names, pick, onPick }: PickTargetsProps) {
  const layerRef = useRef<SVGSVGElement>(null);
  const [stops, setStops] = useState({ neuron: 0, pathway: 0 });
  const moveStop = (kind: NonNullable<Pick>["kind"], index: number) =>
    setStops(current => (current[kind] === index ? current : { ...current, [kind]: index }));

  const onKeyDown = (event: React.KeyboardEvent, target: NonNullable<Pick>, count: number) => {
    // Leave browser and OS shortcuts such as Alt+Left (Back) alone.
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick(togglePick(pick, target));
    } else if (event.key === "Escape") {
      onPick(undefined);
    } else {
      const next = stepAfterKey(target.index, event.key, count);
      if (next !== undefined) {
        event.preventDefault();
        moveStop(target.kind, next);
        layerRef.current
          ?.querySelector<SVGGElement>(`[data-kind="${target.kind}"][data-index="${next}"]`)
          ?.focus();
      }
    }
  };

  /** The props every target's button takes. */
  const buttonProps = (target: NonNullable<Pick>, count: number, label: string) => ({
    role: "button",
    "aria-label": label,
    "aria-pressed": samePick(pick, target),
    tabIndex: stops[target.kind] === target.index ? 0 : -1,
    "data-kind": target.kind,
    "data-index": target.index,
    onClick: () => {
      moveStop(target.kind, target.index);
      onPick(togglePick(pick, target));
    },
    onFocus: () => moveStop(target.kind, target.index),
    onKeyDown: (event: React.KeyboardEvent) => onKeyDown(event, target, count),
  });

  const x = lifted.x + layout.liftedDx;
  // The lifted column always has 14 rows, so there is a second row to measure the pitch from.
  const pitch = lifted.ys[1] - lifted.ys[0];
  const tipX = Math.min(layout.boxes[0].x, width - TIP_ROOM) - TIP_INSET;
  const boxLabel = (p: number) => `Pathway ${p + 1}, show its loadings on the ${lifted.ys.length} neurons`;

  return (
    <svg ref={layerRef} className="pick-targets" role="group" aria-label={TIP_LINES.join(" ")}
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <text data-testid="pick-tip" className="pick-targets__tip" aria-hidden="true" x={tipX} y={TIP_FIRST_BASELINE}>
        {TIP_LINES.map((line, i) => (
          <tspan key={i} x={tipX} dy={i === 0 ? 0 : TIP_LINE_HEIGHT}>{line}</tspan>
        ))}
      </text>
      {lifted.ys.map((y, k) => {
        const target = { kind: "neuron", index: k } as const;
        return (
          <g key={`neuron-${k}`} className="pick-targets__neuron"
            {...buttonProps(target, lifted.ys.length, `${names[k]}, show its loadings on the three pathways`)}>
            <rect className="pick-targets__hit" x={x - lifted.r - TARGET_EXTRA_WIDTH / 2} y={y - pitch / 2}
              width={lifted.r * 2 + TARGET_EXTRA_WIDTH} height={pitch}>
              {/* The copy's tooltip, which the target covers. On the rect, so the button's name isn't repeated. */}
              <title>{names[k]}</title>
            </rect>
            {/* The picked neuron's own ring shows already. */}
            {!samePick(pick, target) && (
              <circle className="pick-targets__hover-ring" cx={x} cy={y} r={lifted.r + PICK_RING_GAP} />
            )}
            <circle className="pick-targets__focus" cx={x} cy={y} r={lifted.r + FOCUS_RING_GAP} />
          </g>
        );
      })}
      {layout.boxes.map((box, p) => {
        const target = { kind: "pathway", index: p } as const;
        const top = box.cy - BOX_SIDE / 2;
        return (
          <g key={`pathway-${p}`} className="pick-targets__box"
            {...buttonProps(target, layout.boxes.length, boxLabel(p))}>
            <rect className="pick-targets__hit pick-targets__box-outline" x={box.x} y={top} width={BOX_SIDE}
              height={BOX_SIDE} rx={BOX_CORNER} />
            <rect className="pick-targets__focus" x={box.x - FOCUS_BOX_GAP} y={top - FOCUS_BOX_GAP}
              width={BOX_SIDE + 2 * FOCUS_BOX_GAP} height={BOX_SIDE + 2 * FOCUS_BOX_GAP}
              rx={BOX_CORNER + FOCUS_BOX_GAP} />
          </g>
        );
      })}
    </svg>
  );
}
