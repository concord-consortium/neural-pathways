import React from "react";
import { observer } from "mobx-react-lite";
import { StepButton } from "./step-buttons";
import { StepPlayer } from "./step-player";
import "./step-row.scss";

interface StepRowProps {
  player: StepPlayer<unknown>;
  buttons: readonly StepButton[];
}

/**
 * A view's step buttons, then Reset. A button plays the run it gives for the steps done; one that
 * gives none is disabled, unless it is the one running, which replays its run. A button shows as pressed while its run
 * plays, or, while nothing runs, when it says it shows the steps done. Reset is unavailable
 * (aria-disabled) while nothing is done or running, and stays in the tab order.
 */
export const StepRow = observer(function StepRow({ player, buttons }: StepRowProps) {
  const { done, running } = player;
  const nothingShown = done === 0 && !running;
  return (
    <div className="step-row" role="group" aria-label="Steps">
      {buttons.map(button => {
        const isRunning = running?.button === button.key;
        const run = button.run(done) ?? (isRunning ? running : undefined);
        const pressed = isRunning || (!running && !!button.showsDone?.(done));
        return (
          <button key={button.key} type="button" className="step-row__step"
            aria-pressed={pressed}
            disabled={!run}
            onClick={run && (() => player.play(button.key, run.from, run.to))}>
            {button.label}
          </button>
        );
      })}
      <button type="button" className="step-row__reset" aria-disabled={nothingShown}
        onClick={nothingShown ? undefined : () => player.reset()}>
        Reset
      </button>
    </div>
  );
});
