import React, { useId, useMemo } from "react";
import { signColor } from "../../core/colors";
import { ForwardPass } from "../../core/network/forward";
import { Network } from "../../core/network/network";
import { NetworkScales } from "../../core/network/network-scales";
import { clamp01, cubicBezier, ease } from "../../core/network-diagram/easing";
import { COLUMN_CAPTIONS, NetworkDrawing } from "../../core/network-diagram/network-drawing";
import { useElementSize } from "../../core/use-element-size";
import {
  CANVAS_HEIGHT, deckPosition, extractGeometry, LABEL_Y, MIN_CANVAS_WIDTH, NETWORK_WIDTH,
} from "./extract-geometry";
import { ExtractScene } from "./extract-scene";
import { Flight, flightDuration, Placed, placeCopy } from "./flight";
import "./extract-drawing.scss";

/** The label's drop-in, overshooting as it lands (the prototype's bounceIn). */
const bounceEase = cubicBezier(0.34, 1.56, 0.64, 1);
/** Gauges shorter than this aren't drawn, as in the network diagram. */
const MIN_GAUGE = 0.35;

/** The hidden neurons' names, as the prototype's tooltips give them: "Hidden Layer 1 Neuron 3". */
function hiddenNames(columnSizes: readonly number[]): string[] {
  return columnSizes.slice(1, -1).flatMap((n, i) =>
    Array.from({ length: n }, (_, k) => `${COLUMN_CAPTIONS[i + 1]} Neuron ${k + 1}`));
}

/** A conversation's hidden activations: Hidden Layer 1's, then Hidden Layer 2's. */
function hiddenValues(pass: ForwardPass): number[] {
  return pass.layers.slice(1, -1).flat();
}

/**
 * What the drawing shows, for screen readers. The lifted column and the deck columns still in
 * flight aren't counted.
 */
export function describeScene(scene: ExtractScene, hidden: number): string {
  const landed = flightDuration(hidden);
  if (!scene.lifted || scene.lifted.flight < landed) {
    return "The network.";
  }
  const collected = scene.deck.filter(column => column.flight >= landed).length;
  const lifted = `The network, with its ${hidden} hidden neurons lifted out`;
  if (collected === 0) {
    return `${lifted}.`;
  }
  return `${lifted} and ${collected} conversation${collected === 1 ? "" : "s"} collected.`;
}

interface CopyProps {
  index: number;
  placed: Placed;
  /** The radius it is drawn at; `placed.r` scales it. */
  r: number;
  name: string;
  /** Its activation, for a deck copy; a lifted copy is empty. */
  value?: number;
  clipId?: string;
}

/** One flown copy of a hidden neuron, drawn about (0, 0) and placed by its transform. */
function Copy({ index, placed, r, name, value, clipId }: CopyProps) {
  const height = value === undefined ? 0 : r * Math.min(1, Math.abs(value));
  return (
    <g data-testid={`copy-${index}`} transform={`translate(${placed.x},${placed.y}) scale(${placed.r / r})`}>
      <title>{name}</title>
      <circle r={r} className="extract-drawing__disc" />
      {value !== undefined && height >= MIN_GAUGE && (
        <rect x={-r} width={r * 2} y={value >= 0 ? -height : 0} height={height} fill={signColor(value)}
          clipPath={`url(#${clipId})`} />
      )}
      <circle r={r} className="extract-drawing__ring" />
    </g>
  );
}

/** "Conversation n", dropping in and settling while `bounce` runs from 0 to 1. */
function ConversationLabel({ x, n, bounce }: { x: number; n: number; bounce: number }) {
  const landed = bounce >= 1;
  const eased = bounceEase(bounce);
  const style = landed ? undefined : {
    transform: `translate(0px, ${-9 * (1 - eased)}px) scale(${0.55 + 0.45 * eased})`,
    opacity: ease(clamp01(bounce / 0.45)),
  };
  return (
    <text x={x} y={LABEL_Y} textAnchor="middle" className="extract-drawing__label extract-drawing__conversation"
      style={style}>
      {`Conversation ${n}`}
    </text>
  );
}

interface ExtractDrawingProps {
  network: Network;
  /** Every conversation's pass, in dataset order. */
  passes: readonly ForwardPass[];
  scales: NetworkScales;
  outputLabels: Record<number, string>;
  scene: ExtractScene;
}

/**
 * Extract Pathways' canvas: the network in the middle, the lifted column in the right strip, the
 * deck in the left, drawn as `scene` says. As wide as its container, but never laid out narrower
 * than MIN_CANVAS_WIDTH; a narrower container scales it down.
 */
export const ExtractDrawing: React.FC<ExtractDrawingProps> = ({ network, passes, scales, outputLabels, scene }) => {
  const [hostRef, size] = useElementSize<HTMLDivElement>({ width: MIN_CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const columnSizes = useMemo(() => network.layers.map(layer => layer.biases.length), [network]);
  const geometry = useMemo(() => extractGeometry(columnSizes, size.width), [columnSizes, size.width]);
  const names = useMemo(() => hiddenNames(columnSizes), [columnSizes]);
  const clipId = `extract-deck-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { width, height, networkX, network: layout, hidden, lifted, deck } = geometry;
  const liftedFlights: Flight[] = useMemo(() => geometry.hidden.map((from, k) => ({
    from,
    to: { x: geometry.lifted.x, y: geometry.lifted.ys[k] },
    fromR: geometry.network.radius,
    toR: geometry.lifted.r,
  })), [geometry]);
  const deckFlights = (column: number): Flight[] => hidden.map((from, k) => ({
    from, to: deckPosition(deck, column, k), fromR: layout.radius, toR: deck.r,
  }));
  const pass = passes[(scene.shown ?? 1) - 1];

  return (
    <div ref={hostRef} className="extract-drawing">
      <svg role="img" aria-label={describeScene(scene, hidden.length)} className="extract-drawing__svg"
        viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <clipPath id={clipId}><circle r={deck.r} /></clipPath>
        </defs>
        <g transform={`translate(${networkX},0)`}>
          <NetworkDrawing network={network} layout={layout} pass={pass} scales={scales} outputLabels={outputLabels}
            scene={scene.network} />
        </g>
        {scene.lifted && (
          <g data-testid="lifted-column">
            {/* The label names the column and isn't dimmed with it, as in the prototype. */}
            <text x={lifted.x} y={LABEL_Y} textAnchor="middle" className="extract-drawing__label"
              opacity={scene.lifted.labelOpacity}>
              Hidden Layer Neurons
            </text>
            <g data-testid="lifted-copies" opacity={scene.lifted.opacity < 1 ? scene.lifted.opacity : undefined}>
              {liftedFlights.map((_, k) => (
                <Copy key={k} index={k} placed={placeCopy(liftedFlights, k, scene.lifted!.flight)} r={lifted.r}
                  name={names[k]} />
              ))}
            </g>
          </g>
        )}
        {scene.deck.map((column, c) => {
          const flights = deckFlights(c);
          const values = hiddenValues(passes[column.conversation - 1]);
          return (
            <g key={c} data-testid={`deck-column-${c}`}>
              {flights.map((_, k) => (
                <Copy key={k} index={k} placed={placeCopy(flights, k, column.flight)} r={deck.r} name={names[k]}
                  value={values[k]} clipId={clipId} />
              ))}
            </g>
          );
        })}
        {scene.label && (
          <ConversationLabel x={networkX + NETWORK_WIDTH / 2} n={scene.label.n} bounce={scene.label.bounce} />
        )}
      </svg>
    </div>
  );
};
