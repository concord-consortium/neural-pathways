import { defineModelMixin, modelAction, tProp, types } from "mobx-keystone";

/**
 * The speed slider's stops, left to right. Each `key` is stored in saved student data: never
 * change one. Keys only order the stops, with normal at 0; they aren't a scale. A new stop goes in
 * its place in this list, with any integer key between its neighbors', or beyond the ends, so no
 * stop is ever renumbered. `name` is shown under the stop, and `durationScale` is how long a run
 * takes there relative to normal: the prototype's Med, which every timeline is written in.
 */
export const SPEEDS = {
  slow: { key: -100, name: "Slow", durationScale: 1.7 },
  normal: { key: 0, name: "Med", durationScale: 1 },
  fast: { key: 100, name: "Fast", durationScale: 0.6 },
} as const;

/** A stored speed: one stop's key. */
export type Speed = typeof SPEEDS[keyof typeof SPEEDS]["key"];

/** The stops in slider order: the order they're listed in, which a test checks follows the keys. */
export const SPEED_STOPS = Object.values(SPEEDS);

/**
 * What the views with an Animate toggle and a speed slider have in common, so one set of controls
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
    speed: tProp(types.or(...SPEED_STOPS.map(stop => types.literal(stop.key))), SPEEDS.normal.key),
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
