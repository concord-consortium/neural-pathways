import React from "react";
import "./actual-label.scss";

interface ActualLabelProps {
  /** The conversation's true answer, or null when it has none. */
  target: number | null;
  /** The dataset's classificationLabels. */
  labels: Record<number, string>;
}

/**
 * The conversation's true answer, as a chip in the class's colors. The chip's modifier is the
 * label, as the network diagram's output pills do it.
 */
export const ActualLabel: React.FC<ActualLabelProps> = ({ target, labels }) => {
  if (target === null) return null;
  const label = labels[target] ?? String(target);
  return (
    <p className="actual-label">
      <span className="actual-label__caption">Actual Label</span>{" "}
      <span className={`actual-label__pill actual-label__pill--${label}`}>{label}</span>
    </p>
  );
};
