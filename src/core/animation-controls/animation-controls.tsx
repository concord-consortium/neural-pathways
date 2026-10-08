import React from "react";
import { observer } from "mobx-react-lite";
import { Animated, Speed, SPEED } from "../state/animation";
import "./animation-controls.scss";

/** The slider's stops, left to right, with the names the prototype shows under them. */
const STOPS: readonly { speed: Speed; name: string }[] = [
  { speed: SPEED.slow, name: "Slow" },
  { speed: SPEED.normal, name: "Med" },
  { speed: SPEED.fast, name: "Fast" },
];

/**
 * The Animate checkbox and the speed slider, for any view whose state is `Animated`. The slider's
 * value is the speed itself, and it is disabled while Animate is off, since nothing animates.
 */
export const AnimationControls = observer(function AnimationControls({ animated }: { animated: Animated }) {
  const { animate, speed } = animated;
  const current = STOPS.find(stop => stop.speed === speed);
  const onSpeedChange = (value: string) => {
    const stop = STOPS.find(s => s.speed === Number(value));
    if (stop) {
      animated.setSpeed(stop.speed);
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
          <input className="animation-controls__slider" type="range" min={SPEED.slow} max={SPEED.fast} step={1}
            value={speed} disabled={!animate} aria-label="Animation speed" aria-valuetext={current?.name}
            onChange={e => onSpeedChange(e.target.value)} />
        </div>
        <div className="animation-controls__stops" aria-hidden="true">
          {STOPS.map(stop => (
            <span key={stop.speed}
              className={`animation-controls__stop${stop.speed === speed ? " animation-controls__stop--current" : ""}`}>
              {stop.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
