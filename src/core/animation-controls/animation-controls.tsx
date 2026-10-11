import React from "react";
import { observer } from "mobx-react-lite";
import { Animated, SPEED_STOPS } from "../state/animation";
import "./animation-controls.scss";

/**
 * The Animate checkbox and the speed slider, for any view whose state is `Animated`. The slider's
 * value is the stop's index in `SPEED_STOPS`, so a stop added between two others gets its own
 * place on the slider. It is disabled while Animate is off, since nothing animates.
 */
export const AnimationControls = observer(function AnimationControls({ animated }: { animated: Animated }) {
  const { animate, speed } = animated;
  const stopIndex = SPEED_STOPS.findIndex(stop => stop.key === speed);
  const onSpeedChange = (value: string) => {
    const stop = SPEED_STOPS[Number(value)];
    if (stop) {
      animated.setSpeed(stop.key);
    }
  };

  return (
    <div className="animation-controls">
      <label className="animation-controls__animate">
        <input type="checkbox" checked={animate} onChange={e => animated.setAnimate(e.target.checked)} />
        Animate
      </label>
      <div className={`animation-controls__speed${animate ? "" : " animation-controls__speed--off"}`}>
        <div className="animation-controls__track">
          <input className="animation-controls__slider" type="range" min={0} max={SPEED_STOPS.length - 1}
            step={1} value={stopIndex} disabled={!animate} aria-label="Animation speed"
            aria-valuetext={SPEED_STOPS[stopIndex]?.name} onChange={e => onSpeedChange(e.target.value)} />
        </div>
        <div className="animation-controls__stops" aria-hidden="true">
          {SPEED_STOPS.map(stop => (
            <span key={stop.key}
              className={`animation-controls__stop${stop.key === speed ? " animation-controls__stop--current" : ""}`}>
              {stop.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
