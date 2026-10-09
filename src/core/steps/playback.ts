import { Speed, SPEED } from "../state/animation";

/**
 * What the step player needs from a view's animation settings. Any `Animated` model is one. Reads
 * must be observable, such as a mobx-keystone model's.
 */
export interface PlaybackSettings {
  readonly animate: boolean;
  readonly speed: Speed;
}

/**
 * How long a run takes at each speed, relative to normal. Normal is the prototype's Med, which its
 * timings were tuned at and every timeline is written in. Slow and Fast are the prototype's own
 * multipliers (`SPEEDS` in neural-net-maker's index.html).
 */
const DURATION_SCALE: Record<Speed, number> = {
  [SPEED.slow]: 1.7,
  [SPEED.normal]: 1,
  [SPEED.fast]: 0.6,
};

export function durationScale(speed: Speed): number {
  return DURATION_SCALE[speed];
}
