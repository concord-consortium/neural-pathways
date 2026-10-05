import React, { useMemo } from "react";
import { Network } from "../network/network";
import { ForwardPass, predictedClass } from "../network/forward";
import { NetworkScales } from "../network/network-scales";
import { useElementSize } from "../use-element-size";
import { layoutNetwork } from "./layout";
import { NetworkDrawing } from "./network-drawing";
import { Scene } from "./scene";
import "./network-diagram.scss";

export { COLUMN_CAPTIONS, OUTPUT_ORDER, popScale } from "./network-drawing";

/** The size drawn until the container reports its own. */
export const DIAGRAM_DEFAULT_SIZE = { width: 537, height: 420 };

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
}

/**
 * One conversation's pass through the network, drawn as far as `scene` says, sized to its
 * container. Stateless: views decide what is drawn and animate by passing new scenes.
 */
export const NetworkDiagram: React.FC<NetworkDiagramProps> = ({ network, pass, scales, outputLabels, scene }) => {
  const [hostRef, size] = useElementSize<HTMLDivElement>(DIAGRAM_DEFAULT_SIZE);
  const columnSizes = useMemo(() => network.layers.map(layer => layer.biases.length), [network]);
  const layout = useMemo(
    () => layoutNetwork(columnSizes, size.width, size.height), [columnSizes, size.width, size.height]);
  const title = scene.answer >= 1
    ? `Network diagram. The network predicts ${capitalize(outputLabels[predictedClass(pass)])}.`
    : "Network diagram";

  return (
    <div ref={hostRef} className="network-diagram">
      <svg role="img" aria-label={title} className="network-diagram__svg"
        width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
        <NetworkDrawing network={network} layout={layout} pass={pass} scales={scales} outputLabels={outputLabels}
          scene={scene} />
      </svg>
    </div>
  );
};
