import { defineModelMixin, modelAction, tProp, types } from "mobx-keystone";

/**
 * The speed slider's stops, left to right. Each `key` is stored in saved student data: never
 * change one. Keys only order the stops, with normal at 0; they aren't a scale. A new stop goes in
 * its place in this list, with any integer key between its neighbors', or beyond the ends, so no
 * stop is ever renumbered. `name` is shown under the stop, and `durationScale` is how long a run
 * takes there relative to normal.
 */
export const SPEED_STOPS = [
  { key: -100, name: "Slow", durationScale: 1.7 },
  { key: 0, name: "Med", durationScale: 1 },
  { key: 100, name: "Fast", durationScale: 0.6 },
] as const;

/** A stored speed: one stop's key. */
export type Speed = typeof SPEED_STOPS[number]["key"];

/** Normal speed, the default: the stop whose runs take their timeline's own durations. */
export const NORMAL_SPEED: Speed = 0;

/**
 * What the views with an Animate checkbox and a speed slider have in common, so one set of controls
 * can drive any of them. Their models get it from `animatedMixin`. The props are `readonly` because
 * keystone only allows changes inside a model action: use the setters.
 */
export interface Animated {
  readonly animate: boolean;
  readonly speed: Speed;
  setAnimate(animate: boolean): void;
  setSpeed(speed: Speed): void;
}

/**
 * Animate, the speed and their setters, for a view's state model. Compose it in, alongside any
 * other mixins: `extends ExtendedModel(composeMixins(animatedMixin), { ...the view's own props })`.
 * The saved form lists the view's own props first, then these.
 */
export const animatedMixin = defineModelMixin(
  {
    animate: tProp(types.boolean, true),
    speed: tProp(types.or(...SPEED_STOPS.map(stop => types.literal(stop.key))), NORMAL_SPEED),
  },
  Base => class extends Base implements Animated {
    @modelAction
    setAnimate(animate: boolean) {
      this.animate = animate;
    }

    @modelAction
    setSpeed(speed: Speed) {
      this.speed = speed;
    }
  },
);
