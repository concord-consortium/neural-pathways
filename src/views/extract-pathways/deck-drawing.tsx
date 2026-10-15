import React from "react";
import { signColor } from "../../core/colors";
import { ForwardPass } from "../../core/network/forward";
import { MIN_GAUGE } from "../../core/network-diagram/network-drawing";
import { centerShift, columnsInSet, columnValues, deckMid, deckWidth, onFrontFace } from "./deck-layout";
import { ColumnGeometry, ExtractGeometry } from "./extract-geometry";
import { DeckScene } from "./extract-scene";

// The deck's depth shading is the prototype's cbShade, and its label and count are nameColumn's
// and showCount's. src/views/README.md says where the prototype is.

/** How much darker each level makes the right face, and the front face. */
const RIGHT_FACE_SHADE = 0.005;
const FRONT_FACE_SHADE = 0.0025;
/** The prototype's cap on the level (`CB_SHADE_CAP`); a deck of 40 sets reaches 39. */
const MAX_SHADE = 40;
/** How far left of a column's top circle its label ends. */
const LABEL_GAP = 20;
/** How far above the deck's top row the count's baseline sits, beyond a radius. */
const COUNT_RISE = 12;

/** Which of the deck's visible surfaces a column is part of. */
export type Face = "right" | "front" | "corner" | "inside";

/**
 * Set 0's columns are the right face, each set's last column is the front face where it shows (see
 * `onFrontFace`), and set 0's last is both. `setColumns` is how many the set holds once all its
 * columns are in.
 */
export function faceOf(set: number, column: number, setColumns: number): Face {
  const front = onFrontFace(set, column, setColumns);
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

/** From the 45° diagonal around to the bottom: the corner's right share of its top circle. */
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
  /** The deck's first column, where every column is drawn before its transform places it. */
  firstColumn: ColumnGeometry;
  set: number;
  column: number;
  face: Face;
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
  { passes, firstColumn, set, column, face, shade, clipPrefix, names, dx = 0, opacity = 1 }: DeckColumnProps
) {
  const values = columnValues(passes, set, column);
  const { r, x: cx } = firstColumn;
  const look = shading(face, shade);
  const row = (k: number, overlays: React.ReactNode) => {
    const v = values[k];
    const cy = firstColumn.ys[k];
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
  const top = firstColumn.ys[0];
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
        {firstColumn.ys.slice(1).map((cy, i) => row(i + 1, look.cornerBody !== undefined
          && <path d={rightHalf(cx, cy, r)} fillOpacity={look.cornerBody} />))}
      </g>
    </g>
  );
});

interface DeckSetProps {
  passes: readonly ForwardPass[];
  firstColumn: ColumnGeometry;
  set: number;
  /** How many of its columns are in. */
  columns: number;
  /** How many it holds once all its columns are in. */
  setColumns: number;
  shade: number;
  lastOpacity: number;
  clipPrefix: string;
  names?: readonly string[];
}

/**
 * One set of the deck: up to 20 columns. Memoized, so a frame that only moves the set redraws none
 * of its columns. Only the face columns take the shade, so a deeper shade redraws just those.
 */
export const DeckSet = React.memo(function DeckSet(
  { columns, setColumns, lastOpacity, shade, ...props }: DeckSetProps,
) {
  return (
    <g data-testid={`deck-set-${props.set}`}>
      {Array.from({ length: columns }, (_, column) => {
        const face = faceOf(props.set, column, setColumns);
        return (
          <DeckColumn key={column} {...props} column={column} face={face} shade={face === "inside" ? 0 : shade}
            opacity={column === columns - 1 ? lastOpacity : 1} />
        );
      })}
    </g>
  );
});

interface DeckDrawingProps {
  deck: DeckScene;
  geometry: ExtractGeometry;
  passes: readonly ForwardPass[];
  /** The hidden neurons' names, for set 0's tooltips. */
  names: readonly string[];
  clipPrefix: string;
  /** How many conversations the deck holds once it is done. */
  size: number;
}

/** The deck once Collect All has started: its sets, set 0's arriving columns and labels, and the count. */
export function DeckDrawing({ deck, geometry, passes, names, clipPrefix, size }: DeckDrawingProps) {
  const firstColumn = geometry.deck;
  const mid = deckMid(geometry);
  const x = deck.centered * centerShift(geometry) - deck.slide * mid;
  const { count } = deck;
  const countX = count ? mid + deck.slide * ((firstColumn.r * deckWidth(count.n)) / 4 - mid) : 0;
  const backToFront = deck.sets.map((set, index) => ({ set, index })).reverse();
  return (
    <>
      <g data-testid="deck" transform={`translate(${x},0)`}>
        {backToFront.map(({ set, index }) => (
          <g key={index} data-testid={`deck-place-${index}`}
            transform={`translate(${set.offset * firstColumn.r + set.shift},0)`}
            opacity={set.opacity < 1 ? set.opacity : undefined}>
            <DeckSet passes={passes} firstColumn={firstColumn} set={index} columns={set.columns}
              setColumns={columnsInSet(index, size)} shade={deck.shade} lastOpacity={set.lastOpacity}
              clipPrefix={clipPrefix} names={index === 0 ? names : undefined} />
            {index === 0 && deck.arriving.map(arriving => (
              <DeckColumn key={`arriving-${arriving.column}`} passes={passes} firstColumn={firstColumn} set={0}
                column={arriving.column} face={faceOf(0, arriving.column, columnsInSet(0, size))} shade={deck.shade}
                clipPrefix={clipPrefix} names={names} dx={arriving.dx} opacity={arriving.opacity} />
            ))}
            {index === 0 && deck.labels.map(label => (
              <text key={`label-${label.column}`} className="extract-drawing__label" textAnchor="end"
                x={firstColumn.x - (label.column + 1) * firstColumn.r - LABEL_GAP}
                y={firstColumn.ys[0] + label.column * firstColumn.r + 4} opacity={label.opacity}>
                {`Conversation ${label.column + 1}`}
              </text>
            ))}
          </g>
        ))}
      </g>
      {count && (
        <text className="extract-drawing__label extract-drawing__count" textAnchor="middle" x={countX}
          y={firstColumn.ys[0] - firstColumn.r - COUNT_RISE} opacity={count.opacity < 1 ? count.opacity : undefined}>
          {`${count.n} Conversation${count.n === 1 ? "" : "s"}`}
        </text>
      )}
    </>
  );
}
