import React, { useCallback, useMemo } from "react";
import { Network } from "../network/network";
import { ForwardPass, predictedClass } from "../network/forward";
import { NetworkScales } from "../network/network-scales";
import { useElementSize } from "../use-element-size";
import { useKeyboardScrollable } from "../use-keyboard-scrollable";
import { layoutNetwork } from "./layout";
import { NetworkDrawing } from "./network-drawing";
import { Scene } from "./scene";
import "./network-diagram.scss";

/** The size drawn until the container reports its own: the content box Trace a Case gives it. */
export const DIAGRAM_DEFAULT_SIZE = { width: 537, height: 440 };

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

interface NetworkDiagramProps {
  network: Network;
  pass: ForwardPass;
  scales: NetworkScales;
  /** Class labels by class index, such as alien3Dataset.classificationLabels. */
  outputLabels: Record<number, string>;
  scene: Scene;
  /** The id of the heading that names the diagram's panel, which names the diagram too. */
  headingId: string;
}

/**
 * One conversation's pass through the network, drawn as far as `scene` says, sized to its
 * container. The only state it keeps is its measured size: views decide what is drawn, and animate
 * by passing new scenes.
 *
 * Never narrower than `MIN_WIDTH`; a narrower container scrolls it sideways, and the keyboard can
 * reach and scroll it (`useKeyboardScrollable`). It is a group named by the panel heading, not a
 * region, since the panel around it is already a region with that name.
 */
export const NetworkDiagram: React.FC<NetworkDiagramProps> = ({
  network, pass, scales, outputLabels, scene, headingId,
}) => {
  const [hostRef, size] = useElementSize<HTMLDivElement>(DIAGRAM_DEFAULT_SIZE);
  const [scrollerRef, scrollerProps] = useKeyboardScrollable<HTMLDivElement>();
  const ref = useCallback((element: HTMLDivElement | null) => {
    hostRef(element);
    scrollerRef(element);
  }, [hostRef, scrollerRef]);
  const columnSizes = useMemo(() => network.layers.map(layer => layer.biases.length), [network]);
  // layoutNetwork rounds the size, so a sub-pixel resize keeps the same layout and the memoized layers.
  const roundedWidth = Math.round(size.width);
  const roundedHeight = Math.round(size.height);
  const layout = useMemo(
    () => layoutNetwork(columnSizes, roundedWidth, roundedHeight), [columnSizes, roundedWidth, roundedHeight]);
  const title = scene.answer >= 1
    ? `Network diagram. The network predicts ${capitalize(outputLabels[predictedClass(pass)])}.`
    : "Network diagram";

  return (
    <div ref={ref} className="network-diagram" role="group" aria-labelledby={headingId} {...scrollerProps}>
      <svg role="img" aria-label={title} className="network-diagram__svg"
        width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
        <NetworkDrawing network={network} layout={layout} pass={pass} scales={scales} outputLabels={outputLabels}
          scene={scene} />
      </svg>
    </div>
  );
};
