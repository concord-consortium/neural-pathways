import React, { useCallback, useMemo } from "react";
import { Network } from "../network/network";
import { ForwardPass, predictedClass } from "../network/forward";
import { NetworkScales } from "../network/network-scales";
import { useElementSize } from "../use-element-size";
import { useKeyboardScrollable } from "../use-keyboard-scrollable";
import { layoutNetwork } from "./layout";
import { NetworkDrawing } from "./network-drawing";
import { NeuronInteraction, NeuronTargets, reachedInteraction } from "./neuron-targets";
import { Scene } from "./scene";
import "./network-diagram.scss";

/** The size drawn until the container reports its own: the content box Looking Inside a Neural Network gives it. */
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
  /** Hover, focus and pin for the neurons. Without it the neurons are only drawn. */
  interaction?: NeuronInteraction;
}

/**
 * One message's pass through the network, drawn as far as `scene` says, sized to its
 * container. The only state it keeps is its measured size: views decide what is drawn, and animate
 * by passing new scenes.
 *
 * Never smaller than `MIN_WIDTH` × `MIN_HEIGHT`; a smaller container scrolls it, and the keyboard
 * can reach and scroll it (`useKeyboardScrollable`). It is a group named by the panel heading,
 * since the panel is already a region with that name. The drawing inside is a group too, holding the
 * reached neurons as buttons when `interaction` is given.
 */
export const NetworkDiagram: React.FC<NetworkDiagramProps> = ({
  network, pass, scales, outputLabels, scene, headingId, interaction,
}) => {
  const [hostRef, size] = useElementSize<HTMLDivElement>(DIAGRAM_DEFAULT_SIZE);
  const [scrollerRef, scrollerProps] = useKeyboardScrollable<HTMLDivElement>();
  const ref = useCallback((element: HTMLDivElement | null) => {
    hostRef(element);
    scrollerRef(element);
  }, [hostRef, scrollerRef]);
  const columnSizes = useMemo(() => network.layers.map(layer => layer.biases.length), [network]);
  // Whole pixels, rounded down: a sub-pixel resize keeps the same layout and the memoized layers, and
  // the drawing is never a fraction of a pixel bigger than its box, which would make it scroll.
  const flooredWidth = Math.floor(size.width);
  const flooredHeight = Math.floor(size.height);
  const layout = useMemo(
    () => layoutNetwork(columnSizes, flooredWidth, flooredHeight), [columnSizes, flooredWidth, flooredHeight]);
  const title = scene.answer >= 1
    ? `Network diagram. The network predicts ${capitalize(outputLabels[predictedClass(pass)])}.`
    : "Network diagram";

  const reached = interaction && reachedInteraction(interaction);
  const rings = reached?.rings;
  // The pin holds the highlight while the pointer moves on, and keyboard focus takes it from a pointer
  // that is only resting over the diagram.
  const highlighted = rings?.pinned ?? rings?.focused ?? rings?.hovered;

  return (
    <div ref={ref} className="network-diagram" role="group" aria-labelledby={headingId} {...scrollerProps}>
      <svg role="group" aria-label={title} className="network-diagram__svg" onClick={interaction?.onClear}
        width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
        <NetworkDrawing network={network} layout={layout} pass={pass} scales={scales} outputLabels={outputLabels}
          scene={scene} highlighted={highlighted} rings={rings} />
        {reached && <NeuronTargets layout={layout} pass={pass} outputLabels={outputLabels}
          interaction={reached} />}
      </svg>
    </div>
  );
};
