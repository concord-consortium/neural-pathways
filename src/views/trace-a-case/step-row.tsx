import React from "react";
import { Step, STEPS } from "./step-timeline";

interface StepRowProps {
  /** The step shown as pressed, or 0 for none. */
  shownStep: number;
  onStep: (step: Step) => void;
  onReset: () => void;
}

/**
 * Step 1 to Step 4, then Reset. The steps are never disabled: each jumps to the state before it
 * and plays, as in the prototype. Reset is available once anything is shown.
 */
export const StepRow: React.FC<StepRowProps> = ({ shownStep, onStep, onReset }) => (
  <div className="step-row" role="group" aria-label="Steps">
    {STEPS.map(step => (
      <button key={step} type="button" className="step-row__step" aria-pressed={shownStep === step}
        onClick={() => onStep(step)}>
        Step {step}
      </button>
    ))}
    <button type="button" className="step-row__reset" disabled={shownStep === 0} onClick={onReset}>
      Reset
    </button>
  </div>
);
