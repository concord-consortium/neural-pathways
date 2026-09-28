import { tProp, types } from "mobx-keystone";

/** Animation speed: 0 slow, 1 normal, 2 fast, the three stops of the prototype's slider. */
export type Speed = 0 | 1 | 2;

const speedType = types.or(types.literal(0), types.literal(1), types.literal(2));

/** Props for the views with an Animate toggle and a speed slider. Spread into `Model({...})`. */
export const animationProps = {
  animate: tProp(types.boolean, true),
  speed: tProp(speedType, 1 as Speed),
};

/** A count that can't go below zero. Checked in development and tests, not in production. */
export const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");
