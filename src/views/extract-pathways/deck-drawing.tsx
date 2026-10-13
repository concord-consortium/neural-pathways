import React from "react";
import { signColor } from "../../core/colors";
import { ForwardPass } from "../../core/network/forward";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import { centerShift, columnValues, deckMid, deckWidth, SET_SIZE } from "./deck-layout";
import { ColumnGeometry, ExtractGeometry } from "./extract-geometry";
import { StackScene } from "./extract-scene";

// The deck's depth shading is the prototype's cbShade, and its label and count are nameColumn's
// and showCount's. src/views/README.md says where the prototype is.

/** How much darker each level makes the right face, and the front face. */
const RIGHT_FACE_SHADE = 0.005;
const FRONT_FACE_SHADE = 0.0025;
/** The deepest level the shading reaches. */
const MAX_SHADE = 40;
/** How far left of a column's top circle its label ends. */
const LABEL_GAP = 20;
/** How far above the deck's top row the count's baseline sits, beyond a radius. */
const COUNT_RISE = 12;

/** Which of the deck's visible surfaces a column is part of. */
export type Face = "right" | "front" | "corner" | "inside";

/** Set 0's columns are the right face, every set's last column is the front face, and set 0's last is both. */
export function faceOf(set: number, column: number): Face {
  const front = column === SET_SIZE - 1;
  if (set === 0) {
    return front ? "corner" : "right";
  }
  return front ? "front" : "inside";
}

type Shape = (cx: number, cy: number, r: number) => string;

const fixed = (n: number) => n.toFixed(2);
const DIAGONAL = Math.SQRT1_2;

/** The lower-right half of a circle, cut on the deck's 45° diagonal: the right face's top circle. */
export const diagonalHalf: Shape = (cx, cy, r) => {
  const k = r * DIAGONAL;
  return `M ${fixed(cx + k)} ${fixed(cy - k)} A ${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(cx - k)} ${fixed(cy + k)} Z`;
};

/** The bottom half of a circle: the front face's top circle. */
export const bottomHalf: Shape = (cx, cy, r) =>
  `M ${fixed(cx + r)} ${fixed(cy)} A ${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(cx - r)} ${fixed(cy)} Z`;

/** The bottom-left quarter of a circle: the corner's front share of its top circle. */
export const bottomLeftQuarter: Shape = (cx, cy, r) =>
  `M ${fixed(cx)} ${fixed(cy)} L ${fixed(cx - r)} ${fixed(cy)} `
  + `A ${fixed(r)} ${fixed(r)} 0 0 0 ${fixed(cx)} ${fixed(cy + r)} Z`;

/** The right half of a circle: the corner's right share of each lower circle. */
export const rightHalf: Shape = (cx, cy, r) =>
  `M ${fixed(cx)} ${fixed(cy - r)} A ${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(cx)} ${fixed(cy + r)} Z`;

/** From the 45° diagonal round to the bottom: the corner's right share of its top circle. */
export const rightSector: Shape = (cx, cy, r) => {
  const k = r * DIAGONAL;
  return `M ${fixed(cx)} ${fixed(cy)} L ${fixed(cx + k)} ${fixed(cy - k)} `
    + `A ${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(cx)} ${fixed(cy + r)} Z`;
};

/** How a column is shaded: each field is left out when there is nothing to draw. */
export interface Shading {
  /** brightness() on every row but the top. */
  body?: number;
  /** A black overlay on the top circle. */
  top?: { shape: Shape; opacity: number };
  /** The corner's extra overlay on the right half of every row but the top, so it reads as the right face. */
  cornerBody?: number;
  /** The corner's overlay on the right face's share of its top circle. */
  cornerTop?: number;
}

/** How `face` is shaded at `level`, the sets behind set 0, up to MAX_SHADE. */
export function shading(face: Face, level: number): Shading {
  const depth = Math.min(MAX_SHADE, level);
  if (depth <= 0 || face === "inside") {
    return {};
  }
  const right = RIGHT_FACE_SHADE * depth;
  const front = FRONT_FACE_SHADE * depth;
  switch (face) {
    case "right":
      return { body: 1 - right, top: { shape: diagonalHalf, opacity: right } };
    case "front":
      return { body: 1 - front, top: { shape: bottomHalf, opacity: front } };
    case "corner":
      return {
        body: 1 - front,
        top: { shape: bottomLeftQuarter, opacity: front },
        cornerBody: 1 - (1 - right) / (1 - front),
        cornerTop: right,
      };
  }
}

/** The id of the clip that cuts row `row`'s gauges to their circle. ExtractDrawing defines one per row. */
export function rowClipId(prefix: string, row: number): string {
  return `${prefix}-row-${row}`;
}

interface DeckColumnProps {
  passes: readonly ForwardPass[];
  deck: ColumnGeometry;
  set: number;
  column: number;
  shade: number;
  clipPrefix: string;
  /** Each row's neuron name, for set 0's tooltips. */
  names?: readonly string[];
  dx?: number;
  opacity?: number;
}

/**
 * One column of the deck: a conversation's 14 hidden activations, as gauges in the deck's rows.
 * Drawn at the deck's first column and placed by its transform, so its rows share one clip each.
 */
const DeckColumn = React.memo(function DeckColumn(
  { passes, deck, set, column, shade, clipPrefix, names, dx = 0, opacity = 1 }: DeckColumnProps
) {
  const values = columnValues(passes, set, column);
  const { r, x: cx } = deck;
  const look = shading(faceOf(set, column), shade);
  const row = (k: number, overlays: React.ReactNode) => {
    const v = values[k];
    const cy = deck.ys[k];
    const height = r * Math.min(1, Math.abs(v));
    const parts = (
      <>
        <circle cx={cx} cy={cy} r={r} className="extract-drawing__disc" />
        {height >= MIN_GAUGE && (
          <rect x={cx - r} y={v >= 0 ? cy - height : cy} width={r * 2} height={height} fill={signColor(v)}
            clipPath={`url(#${rowClipId(clipPrefix, k)})`} />
        )}
        {overlays}
        <circle cx={cx} cy={cy} r={r} className="extract-drawing__ring" />
      </>
    );
    return names
      ? <g key={k}><title>{names[k]}</title>{parts}</g>
      : <React.Fragment key={k}>{parts}</React.Fragment>;
  };
  const top = deck.ys[0];
  return (
    <g data-testid={`deck-${set}-${column}`} transform={`translate(${-column * r + dx},${column * r})`}
      opacity={opacity < 1 ? opacity : undefined}>
      {row(0, (
        <>
          {look.top && <path d={look.top.shape(cx, top, r)} fillOpacity={look.top.opacity} />}
          {look.cornerTop !== undefined && <path d={rightSector(cx, top, r)} fillOpacity={look.cornerTop} />}
        </>
      ))}
      <g style={look.body !== undefined ? { filter: `brightness(${look.body})` } : undefined}>
        {deck.ys.slice(1).map((cy, i) => row(i + 1, look.cornerBody !== undefined
          && <path d={rightHalf(cx, cy, r)} fillOpacity={look.cornerBody} />))}
      </g>
    </g>
  );
});

interface DeckSetProps {
  passes: readonly ForwardPass[];
  deck: ColumnGeometry;
  set: number;
  columns: number;
  shade: number;
  lastOpacity: number;
  clipPrefix: string;
  names?: readonly string[];
}

/**
 * One set of the deck: up to 20 columns. Memoized, so a frame that only moves the set redraws none
 * of its columns. Only the face columns take the shade, so a deeper shade redraws just those.
 */
export const DeckSet = React.memo(function DeckSet({ columns, lastOpacity, shade, ...props }: DeckSetProps) {
  return (
    <g data-testid={`deck-set-${props.set}`}>
      {Array.from({ length: columns }, (_, column) => (
        <DeckColumn key={column} {...props} column={column} shade={faceOf(props.set, column) === "inside" ? 0 : shade}
          opacity={column === columns - 1 ? lastOpacity : 1} />
      ))}
    </g>
  );
});

interface DeckStackProps {
  stack: StackScene;
  geometry: ExtractGeometry;
  passes: readonly ForwardPass[];
  /** The hidden neurons' names, for set 0's tooltips. */
  names: readonly string[];
  clipPrefix: string;
}

/** The deck once Collect All has started: its sets, set 0's arriving columns and labels, and the count. */
export function DeckStack({ stack, geometry, passes, names, clipPrefix }: DeckStackProps) {
  const { deck } = geometry;
  const mid = deckMid(geometry);
  const x = stack.centered * centerShift(geometry) - stack.slide * mid;
  const { count } = stack;
  const countX = count ? mid + stack.slide * ((deck.r * deckWidth(count.n)) / 4 - mid) : 0;
  const backToFront = stack.sets.map((set, index) => ({ set, index })).reverse();
  return (
    <>
      <g data-testid="deck" transform={`translate(${x},0)`}>
        {backToFront.map(({ set, index }) => (
          <g key={index} transform={`translate(${set.offset * deck.r + set.shift},0)`}
            opacity={set.opacity < 1 ? set.opacity : undefined}>
            <DeckSet passes={passes} deck={deck} set={index} columns={set.columns} shade={stack.shade}
              lastOpacity={set.lastOpacity} clipPrefix={clipPrefix} names={index === 0 ? names : undefined} />
            {index === 0 && stack.arriving.map(arriving => (
              <DeckColumn key={`arriving-${arriving.column}`} passes={passes} deck={deck} set={0}
                column={arriving.column} shade={stack.shade} clipPrefix={clipPrefix} names={names}
                dx={arriving.dx} opacity={arriving.opacity} />
            ))}
            {index === 0 && stack.labels.map(label => (
              <text key={`label-${label.column}`} className="extract-drawing__label" textAnchor="end"
                x={deck.x - (label.column + 1) * deck.r - LABEL_GAP} y={deck.ys[0] + label.column * deck.r + 4}
                opacity={label.opacity}>
                {`Conversation ${label.column + 1}`}
              </text>
            ))}
          </g>
        ))}
      </g>
      {count && (
        <text className="extract-drawing__label extract-drawing__count" textAnchor="middle" x={countX}
          y={deck.ys[0] - deck.r - COUNT_RISE} opacity={count.opacity < 1 ? count.opacity : undefined}>
          {`${count.n} Conversation${count.n === 1 ? "" : "s"}`}
        </text>
      )}
    </>
  );
}
