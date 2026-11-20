import React, { useLayoutEffect, useState } from "react";
import { Point } from "../../core/network-diagram/layout";
import { chipsAt } from "./word-flights";
import "./word-flight-overlay.scss";

interface Geometry {
  words: Point[];
  inputs: Point[];
}

function centerIn(element: Element, origin: DOMRect): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2 - origin.left, y: rect.top + rect.height / 2 - origin.top };
}

/** The centers of the card's words and of the input neurons (top to bottom), in `container`'s coordinates. */
function measure(container: HTMLElement): Geometry {
  const origin = container.getBoundingClientRect();
  const words = Array.from(container.querySelectorAll(".message-words__word"), word => centerIn(word, origin));
  // The outlines, not the neurons' buttons, which carry the same data attributes.
  const inputs = Array.from(container.querySelectorAll(".network-diagram__node[data-column='0']"))
    .sort((a, b) => Number(a.getAttribute("data-unit")) - Number(b.getAttribute("data-unit")))
    .map(node => centerIn(node, origin));
  return { words, inputs };
}

/**
 * Draws one chip per copy of a word in flight toward an input neuron, over `container`, which must
 * be positioned. `time` is the time into Step 1, or undefined when nothing is flying. Positions
 * are measured when Step 1 starts and again whenever the container resizes, so the chips follow
 * the layout.
 */
export const WordFlightOverlay: React.FC<{
  time: number | undefined;
  words: readonly string[];
  container: HTMLElement | null;
}> = ({ time, words, container }) => {
  const flying = time !== undefined;
  const [geometry, setGeometry] = useState<Geometry>();

  // A layout effect, so the first frame of a run is measured before it is drawn.
  useLayoutEffect(() => {
    if (!flying || !container) {
      return undefined;
    }
    // Observing reports the container's size at once, which measures for the start of the run.
    const observer = new ResizeObserver(() => setGeometry(measure(container)));
    observer.observe(container);
    return () => {
      observer.disconnect();
      // Forget the measurement, so the next run draws nothing until it has measured its own.
      setGeometry(undefined);
    };
  }, [flying, container]);

  if (time === undefined || !geometry) {
    return null;
  }
  return (
    <div className="word-flight-overlay" data-testid="word-flight-overlay" aria-hidden="true">
      {chipsAt(time, geometry.words, geometry.inputs).map(chip => (
        <span key={`${chip.unit}-${chip.word}`} className="word-flight-overlay__chip"
          style={{
            left: chip.x, top: chip.y, opacity: chip.opacity,
            transform: `translate(-50%, -50%) scale(${chip.scale})`,
          }}>
          {words[chip.word]}
        </span>
      ))}
    </div>
  );
};
