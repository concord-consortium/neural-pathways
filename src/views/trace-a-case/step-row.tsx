import React from "react";
import { Step, STEPS } from "./step-timeline";

interface StepRowProps {
  /** The step marked current, or 0 for none. */
  shownStep: number;
  onStep: (step: Step) => void;
  onReset: () => void;
}

/**
 * Step 1 to Step 4, then Reset. Each step is a plain button that plays it, and the step shown is
 * marked with aria-current="step". Pressing it again replays it, so it isn't a toggle. The steps
 * are never disabled, as in the prototype. Reset is aria-disabled while no step is shown, so it
 * stays in the tab order.
 */
export const StepRow: React.FC<StepRowProps> = ({ shownStep, onStep, onReset }) => (
  <div className="step-row" role="group" aria-label="Steps">
    {STEPS.map(step => (
      <button key={step} type="button" className="step-row__step"
        aria-current={shownStep === step ? "step" : undefined}
        onClick={() => onStep(step)}>
        Step {step}
      </button>
    ))}
    <button type="button" className="step-row__reset" aria-disabled={shownStep === 0}
      onClick={shownStep === 0 ? undefined : onReset}>
      Reset
    </button>
  </div>
);
