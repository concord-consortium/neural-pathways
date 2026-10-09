import React from "react";
import { observer } from "mobx-react-lite";
import { StepButton } from "./step-button";
import { StepPlayer } from "./step-player";
import "./step-row.scss";

interface StepRowProps {
  player: StepPlayer<unknown>;
  buttons: readonly StepButton[];
}

/**
 * A view's step buttons, then Reset. A button plays the segment it gives for the marker the
 * timeline rests at; one that gives none is disabled, unless it is the one running, which replays
 * its run. The current step is marked with aria-current="step": the button whose run plays, or,
 * while nothing runs, the one that says to at the marker. Pressing it again replays it, so the
 * buttons aren't toggles. Reset is unavailable (aria-disabled) at the start with nothing running,
 * and stays in the tab order.
 */
export const StepRow = observer(function StepRow({ player, buttons }: StepRowProps) {
  const { marker, currentRun } = player;
  const nothingShown = marker === 0 && !currentRun;
  return (
    <div className="step-row" role="group" aria-label="Steps">
      {buttons.map(button => {
        const isRunning = currentRun?.button === button.key;
        const segment = button.segmentToPlayWhenAt(marker) ?? (isRunning ? currentRun : undefined);
        const current = isRunning || (!currentRun && !!button.showAsCurrentWhenAt?.(marker));
        return (
          <button key={button.key} type="button" className="step-row__step"
            aria-current={current ? "step" : undefined}
            disabled={!segment}
            onClick={segment && (() => player.play(button.key, segment))}>
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
