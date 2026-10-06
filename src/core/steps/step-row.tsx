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
 * A view's step buttons, then Reset. A button plays the segment it gives for the marker the timeline
 * rests at; one that gives none is disabled, unless it is the one running, which replays its run. A
 * button shows as pressed while its run plays, or, while nothing runs, when it says to at the
 * marker. Reset is unavailable (aria-disabled) at the start with nothing running, and stays in the
 * tab order.
 */
export const StepRow = observer(function StepRow({ player, buttons }: StepRowProps) {
  const { marker, running } = player;
  const nothingShown = marker === 0 && !running;
  return (
    <div className="step-row" role="group" aria-label="Steps">
      {buttons.map(button => {
        const isRunning = running?.button === button.key;
        const segment = button.segmentToPlayWhenAt(marker) ?? (isRunning ? running : undefined);
        const pressed = isRunning || (!running && !!button.showAsPressedWhenAt?.(marker));
        return (
          <button key={button.key} type="button" className="step-row__step"
            aria-pressed={pressed}
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
