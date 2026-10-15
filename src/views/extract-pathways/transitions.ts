import { clamp01, ease } from "../../core/network-diagram/easing";

/** From `a` to `b` by `p`, landing exactly on `a` at 0 and on `b` at 1. */
export function lerp(a: number, b: number, p: number): number {
  if (p <= 0) {
    return a;
  }
  if (p >= 1) {
    return b;
  }
  return a + (b - a) * p;
}

/** One CSS transition of a value: starting at `start`, over `duration` ms, to `to`. */
export interface Transition {
  start: number;
  duration: number;
  to: number;
}

/**
 * A value that starts at `initial` and is carried by `transitions`, in order, at time `t`. Each one
 * starts from wherever the value is when it starts, as a CSS transition does when its target
 * changes partway through, and eases with `curve`. For curves that don't overshoot.
 */
export function transitionAt(initial: number, transitions: readonly Transition[], t: number,
  curve: (p: number) => number = ease): number {
  let from = initial;
  let active: Transition | undefined;
  const valueAt = (time: number): number => {
    if (!active) {
      return from;
    }
    const p = active.duration > 0 ? clamp01((time - active.start) / active.duration) : 1;
    return lerp(from, active.to, curve(p));
  };
  for (const transition of transitions) {
    if (transition.start > t) {
      break;
    }
    from = valueAt(transition.start);
    active = transition;
  }
  return valueAt(t);
}
