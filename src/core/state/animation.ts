import { tProp, types } from "mobx-keystone";

/**
 * Animation speeds: the three stops of the prototype's slider. The values are stored in saved
 * student data: never change them.
 */
export const SPEED = { slow: 0, normal: 1, fast: 2 } as const;
export type Speed = typeof SPEED[keyof typeof SPEED];

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
