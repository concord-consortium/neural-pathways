import React, { useLayoutEffect, useRef, useState } from "react";
import "./readout-box.scss";

/** The gap above the box, which `onHeightChange` counts in the height it reports. */
const MARGIN_TOP = 8;

interface ReadoutBoxProps {
  /** What the box shows now; the box is empty when this is undefined. */
  content: React.ReactNode | undefined;
  /**
   * Every text the box can show for this message, prompts and readouts. The box holds the height of
   * the tallest. A readout is measured with room for the Clear button, which only readouts show.
   */
  candidates: { prompts: readonly React.ReactNode[]; readouts: readonly React.ReactNode[] };
  /** True when `content` is the prompt, which is italic, rather than a readout. */
  idle: boolean;
  /** Shows the Clear button, which calls this. */
  onClear?: () => void;
  /** Called with the box's held height, plus its margin, whenever that changes. */
  onHeightChange?: (px: number) => void;
}

/**
 * The prompt or a pinned neuron's readout. The box holds the height of its tallest possible text as
 * a `min-height`, so that showing a different text never resizes the diagram. The height is
 * measured from an off-layout twin of the box holding every candidate, laid out at the box's width
 * and font size. It is a `min-height` and nothing is clipped, so text that outgrows it before the
 * next measurement grows the box instead of being cut off.
 */
export const ReadoutBox: React.FC<ReadoutBoxProps> = ({ content, candidates, idle, onClear, onHeightChange }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const heightChange = useRef(onHeightChange);
  useLayoutEffect(() => {
    heightChange.current = onHeightChange;
  });

  const measure = () => {
    const tallest = Array.from(stackRef.current?.children ?? [])
      .reduce((max, child) => Math.max(max, (child as HTMLElement).offsetHeight), 0);
    setHeight(tallest);
  };

  // The candidates can change on any render, and the layout they are measured in can change without one.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- measuring the laid-out twin needs the DOM
  useLayoutEffect(measure);

  // The box's width changes with browser zoom. The candidates' stack, as tall as the candidates, grows
  // with the font size under text-only zoom, which may leave the width alone; the twin around it has no
  // height, so observing the twin would never fire.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const resizes = new ResizeObserver(measure);
    if (boxRef.current) resizes.observe(boxRef.current);
    if (stackRef.current) resizes.observe(stackRef.current);
    return () => resizes.disconnect();
  }, []);

  useLayoutEffect(() => {
    heightChange.current?.(height + MARGIN_TOP);
  }, [height]);

  return (
    <div className="readout-box__wrap">
      <div
        ref={boxRef}
        data-testid="readout-box"
        className={`readout-box${idle ? " readout-box--idle" : ""}`}
        style={height > 0 ? { minHeight: height } : undefined}
      >
        <div className="readout-box__text" role="status" aria-live="polite">{content}</div>
        {onClear && (
          <button type="button" className="readout-box__clear" aria-label="Clear" onClick={onClear}>
            {"×"}
          </button>
        )}
      </div>
      <div data-testid="readout-measure" className="readout-box__measure" aria-hidden="true">
        <div ref={stackRef} data-testid="readout-measure-stack">
          {candidates.prompts.map((candidate, i) => (
            <div key={`prompt-${i}`} data-testid="readout-candidate"
              className="readout-box__candidate readout-box__candidate--idle">
              <div className="readout-box__text">{candidate}</div>
            </div>
          ))}
          {candidates.readouts.map((candidate, i) => (
            <div key={`readout-${i}`} data-testid="readout-candidate" className="readout-box__candidate">
              <div className="readout-box__text">{candidate}</div>
              <span className="readout-box__stand-in" data-testid="readout-stand-in" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
