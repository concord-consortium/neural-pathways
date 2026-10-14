import { Speed, SPEED_STOPS } from "../state/animation";

/** What the step player needs from a view's animation settings. Any `Animated` model is one. */
export interface PlaybackSettings {
  readonly animate: boolean;
  readonly speed: Speed;
}

/** How long a run takes at `speed`, relative to normal: the stop's `durationScale`. */
export function durationScale(speed: Speed): number {
  const stop = SPEED_STOPS.find(s => s.key === speed);
  if (!stop) {
    throw new RangeError(`There is no speed ${speed}`);
  }
  return stop.durationScale;
}
