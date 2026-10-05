import React, { useId } from "react";
import { Network } from "../network/network";
import { ForwardPass, predictedClass } from "../network/forward";
import { magnitudeBand, NetworkScales } from "../network/network-scales";
import { signColor } from "../colors";
import { clamp01, cubicBezier } from "./easing";
import { NetworkLayout, PILL_GAP } from "./layout";
import { Scene } from "./scene";
import "./network-diagram.scss";

export const COLUMN_CAPTIONS = ["Input Layer", "Hidden Layer 1", "Hidden Layer 2", "Output Layer"];
/** Output units top to bottom: Approach (class 1) above Wait (class 0), as in the prototype. */
export const OUTPUT_ORDER = [1, 0];
/** Stroke widths for the thin, mid and thick bands. */
const EDGE_WIDTHS = [1, 2, 3];
/** The winning pill grows by this much on every side. */
const PILL_GROW = 3;
/** Gauges shorter than this aren't drawn. */
const MIN_GAUGE = 0.35;
/** The prototype's d1a-pillpop keyframes, each segment eased like its CSS animation. */
const POP_KEYS: readonly (readonly [number, number])[] = [[0, 0.94], [0.45, 1.1], [0.72, 0.98], [1, 1]];
const popEase = cubicBezier(0.34, 1.1, 0.5, 1);

/** The winning pill's scale while the answer arrives, for `answer` from 0 to 1. */
export function popScale(answer: number): number {
  const t = clamp01(answer);
  for (let i = 1; i < POP_KEYS.length; i++) {
    const [t1, s1] = POP_KEYS[i];
    if (t <= t1) {
      const [t0, s0] = POP_KEYS[i - 1];
      return s0 + (s1 - s0) * popEase((t - t0) / (t1 - t0));
    }
  }
  return 1;
}

/** The unit drawn in a row: rows are units, except in the output column, which follows OUTPUT_ORDER. */
function unitAt(column: number, row: number, lastColumn: number): number {
  return column === lastColumn ? OUTPUT_ORDER[row] : row;
}

/** An opacity attribute, left off at full strength. */
function opacity(value: number): number | undefined {
  return value >= 1 ? undefined : value;
}


export interface NetworkDrawingProps {
  network: Network;
  layout: NetworkLayout;
  pass: ForwardPass;
  scales: NetworkScales;
  /** Class labels by class index, such as alien3Dataset.classificationLabels. */
  outputLabels: Record<number, string>;
  scene: Scene;
}

/**
 * One conversation's pass through the network as an SVG group, laid out by `layout` and drawn as
 * far as `scene` says. NetworkDiagram sizes it and wraps it in an SVG of its own; a view that draws
 * more around the network places it in its own SVG. Stateless: views animate it by passing new
 * scenes.
 */
export const NetworkDrawing: React.FC<NetworkDrawingProps> = (
  { network, layout, pass, scales, outputLabels, scene },
) => {
  const clipPrefix = `network-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lastColumn = layout.nodes.length - 1;
  const { radius } = layout;
  const winner = predictedClass(pass);
  const { rest, hidden } = scene.dim;
  /** The hidden layers' nodes take `hidden`; the input and output nodes take `rest`. */
  const columnOpacity = (column: number) => (column > 0 && column < lastColumn ? hidden : rest);

  const nodeValue = (column: number, unit: number) =>
    column === lastColumn ? pass.layers[column][unit] / scales.logitScale : pass.layers[column][unit];

  const edges: React.ReactElement[] = [];
  for (let gap = 0; gap < lastColumn; gap++) {
    const thresholds = scales.edgeThresholds[gap];
    const weights = network.layers[gap + 1].weights;
    layout.nodes[gap].forEach((from, sourceRow) => {
      const source = unitAt(gap, sourceRow, lastColumn);
      const drawn = scene.edgeDraw[gap][source];
      if (drawn <= 0) {
        return;
      }
      const near = clamp01(drawn * 2);
      const far = clamp01(drawn * 2 - 1);
      const activation = pass.layers[gap][source];
      layout.nodes[gap + 1].forEach((to, targetRow) => {
        const target = unitAt(gap + 1, targetRow, lastColumn);
        const contribution = activation * weights[target][source];
        const x1 = from.x + radius;
        const x2 = to.x - radius;
        const mx = (x1 + x2) / 2;
        const my = (from.y + to.y) / 2;
        const half = Math.hypot(mx - x1, my - from.y);
        const id = `${gap}-${source}-${target}`;
        edges.push(
          <line key={`near-${id}`} data-testid={`edge-near-${id}`} className="network-diagram__edge"
            x1={x1} y1={from.y} x2={mx} y2={my}
            stroke={signColor(activation)} strokeWidth={EDGE_WIDTHS[magnitudeBand(activation, thresholds)]}
            strokeDasharray={half} strokeDashoffset={half * (1 - near)} />,
        );
        if (far > 0) {
          edges.push(
            <line key={`far-${id}`} data-testid={`edge-far-${id}`} className="network-diagram__edge"
              x1={mx} y1={my} x2={x2} y2={to.y}
              stroke={signColor(contribution)} strokeWidth={EDGE_WIDTHS[magnitudeBand(contribution, thresholds)]}
              strokeDasharray={half} strokeDashoffset={half * (1 - far)} />,
          );
        }
      });
    });
  }

  const gauges: React.ReactElement[] = [];
  layout.nodes.forEach((column, c) => column.forEach((node, row) => {
    const unit = unitAt(c, row, lastColumn);
    const shown = nodeValue(c, unit) * clamp01(scene.nodeFill[c][unit]);
    const height = radius * Math.min(1, Math.abs(shown));
    if (height < MIN_GAUGE) {
      return;
    }
    gauges.push(
      <rect key={`${c}-${unit}`} data-testid={`gauge-${c}-${unit}`} opacity={opacity(columnOpacity(c))}
        x={node.x - radius} width={radius * 2} y={shown >= 0 ? node.y - height : node.y} height={height}
        fill={signColor(shown)} clipPath={`url(#${clipPrefix}-${c}-${row})`} />,
    );
  }));

  const outputNodes = layout.nodes[lastColumn];

  return (
    <g className="network-drawing">
      <g className="network-diagram__pills" opacity={opacity(rest)}>
        {layout.pills.map((box, row) => {
          const unit = OUTPUT_ORDER[row];
          const won = scene.answer > 0 && unit === winner;
          const grow = won ? PILL_GROW : 0;
          const height = box.height + grow * 2;
          const classes = ["network-diagram__pill", `network-diagram__pill--${outputLabels[unit]}`];
          if (won) {
            classes.push("network-diagram__pill--won");
          }
          return (
            <rect key={unit} data-testid={`pill-${unit}`} className={classes.join(" ")}
              x={box.x - grow} y={box.y - grow} width={box.width + grow * 2} height={height} rx={height / 2}
              style={won ? { transform: `scale(${popScale(scene.answer)})` } : undefined} />
          );
        })}
      </g>
      <Wires layout={layout} lastColumn={lastColumn} opacity={opacity(rest)} />
      <g className="network-diagram__edges" opacity={opacity(rest)}>{edges}</g>
      <Discs layout={layout} clipPrefix={clipPrefix} columnOpacity={columnOpacity} rest={rest} hidden={hidden} />
      <g className="network-diagram__gauges">{gauges}</g>
      <Outlines layout={layout} lastColumn={lastColumn} columnOpacity={columnOpacity} rest={rest} hidden={hidden} />
      <g className="network-diagram__labels" opacity={opacity(rest)}>
        {outputNodes.map((node, row) => {
          const unit = OUTPUT_ORDER[row];
          const box = layout.pills[row];
          return (
            <React.Fragment key={unit}>
              <text x={node.x + radius + PILL_GAP} y={node.y + 4}
                className={`network-diagram__output-label network-diagram__output-label--${outputLabels[unit]}`}>
                {outputLabels[unit].toUpperCase()}
              </text>
              <text x={box.x} y={box.y - 9} className="network-diagram__output-caption">
                {unit === 1 ? "Target Class:" : "Other Class:"}
              </text>
            </React.Fragment>
          );
        })}
        {scene.weightLabel.map((shown, gap) => shown && (
          <text key={gap} data-testid={`weight-label-${gap}`} className="network-diagram__weight-label"
            textAnchor="middle" x={(layout.columnX[gap] + layout.columnX[gap + 1]) / 2}
            y={layout.nodes[gap][0].y - (gap < 2 ? 5 : 0)}>
            × weight
          </text>
        ))}
      </g>
    </g>
  );
};

interface WiresProps {
  layout: NetworkLayout;
  lastColumn: number;
  opacity: number | undefined;
}

/** The gray scaffold. Drawn signal halves lie on top and cover it. */
const Wires = React.memo(function Wires({ layout, lastColumn, opacity: groupOpacity }: WiresProps) {
  const { nodes, radius } = layout;
  const lines: React.ReactElement[] = [];
  for (let gap = 0; gap < nodes.length - 1; gap++) {
    nodes[gap].forEach((from, sourceRow) => nodes[gap + 1].forEach((to, targetRow) => {
      const id = `${gap}-${unitAt(gap, sourceRow, lastColumn)}-${unitAt(gap + 1, targetRow, lastColumn)}`;
      lines.push(
        <line key={id} data-testid={`wire-${id}`} x1={from.x + radius} y1={from.y} x2={to.x - radius} y2={to.y} />,
      );
    }));
  }
  return <g className="network-diagram__wires" opacity={groupOpacity}>{lines}</g>;
});

interface NodeLayerProps {
  layout: NetworkLayout;
  columnOpacity: (column: number) => number;
  /** Compared by React.memo in place of columnOpacity, which is a new function each render. */
  rest: number;
  hidden: number;
}

const sameNodeLayer = <P extends NodeLayerProps>(a: P, b: P) =>
  (Object.keys(a) as (keyof P)[]).every(key => key === "columnOpacity" || a[key] === b[key]);

/** White discs that hide the edges behind each node, and the clip paths for the gauges. */
const Discs = React.memo(function Discs(
  { layout, clipPrefix, columnOpacity }: NodeLayerProps & { clipPrefix: string },
) {
  const clips: React.ReactElement[] = [];
  const discs: React.ReactElement[] = [];
  layout.nodes.forEach((column, c) => column.forEach((node, row) => {
    clips.push(
      <clipPath key={`${c}-${row}`} id={`${clipPrefix}-${c}-${row}`}>
        <circle cx={node.x} cy={node.y} r={layout.radius} />
      </clipPath>,
    );
    discs.push(
      <circle key={`${c}-${row}`} cx={node.x} cy={node.y} r={layout.radius} opacity={opacity(columnOpacity(c))} />,
    );
  }));
  return (
    <>
      <defs>{clips}</defs>
      <g className="network-diagram__discs">{discs}</g>
    </>
  );
}, sameNodeLayer);

/** Node outlines, drawn over the gauges so the edge stays crisp, and the column captions. */
const Outlines = React.memo(function Outlines(
  { layout, lastColumn, columnOpacity, rest }: NodeLayerProps & { lastColumn: number },
) {
  const outlines: React.ReactElement[] = [];
  layout.nodes.forEach((column, c) => column.forEach((node, row) => {
    const unit = unitAt(c, row, lastColumn);
    outlines.push(
      <circle key={`${c}-${unit}`} data-testid={`node-${c}-${unit}`} className="network-diagram__node"
        cx={node.x} cy={node.y} r={layout.radius} opacity={opacity(columnOpacity(c))} />,
    );
  }));
  return (
    <>
      <g className="network-diagram__nodes">{outlines}</g>
      {layout.columnX.map((x, c) => (
        <text key={c} x={x} y={layout.captionY} textAnchor="middle" className="network-diagram__caption"
          opacity={opacity(rest)}>
          {COLUMN_CAPTIONS[c]}
        </text>
      ))}
    </>
  );
}, sameNodeLayer);
