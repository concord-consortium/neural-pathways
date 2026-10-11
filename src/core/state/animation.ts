import { tProp, types } from "mobx-keystone";

/**
 * Animation speeds: the stops of the speed slider. The values are stored in saved student data:
 * never change them. They only order the stops, with normal at 0; they aren't a scale, and how
 * fast each stop plays is up to the step player. A new stop takes any integer between its
 * neighbors, or beyond the ends, so no stop is ever renumbered.
 */
export const SPEED = { slow: -100, normal: 0, fast: 100 } as const;
export type Speed = typeof SPEED[keyof typeof SPEED];

/**
 * What the views with an Animate toggle and a speed slider have in common, so one set of controls
 * can drive any of them. Their models declare `implements Animated`, so the compiler checks both
 * the props and the setters. The props are `readonly` because keystone only allows changes inside
 * a model action: use the setters.
 */
export interface Animated {
  readonly animate: boolean;
  readonly speed: Speed;
  setAnimate(animate: boolean): void;
  setSpeed(speed: Speed): void;
}

/** Props for the views with an Animate toggle and a speed slider. Spread into `Model({...})`. */
export const animationProps = {
  animate: tProp(types.boolean, true),
  speed: tProp(types.enum(SPEED), SPEED.normal),
};
