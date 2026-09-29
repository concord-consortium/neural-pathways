import { tProp, types } from "mobx-keystone";

/**
 * Animation speeds: the three stops of the prototype's slider. The values are stored in saved
 * student data: never change them.
 */
export const SPEED = { slow: 0, normal: 1, fast: 2 } as const;
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

/**
 * A count that can't go below zero. Checked whenever keystone type checking is on, which the
 * student app turns on everywhere.
 */
export const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");
