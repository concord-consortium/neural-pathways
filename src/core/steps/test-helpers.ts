import { action, makeObservable, observable } from "mobx";
import { Animated, Speed, SPEED } from "../state/animation";
import { PlaybackSettings } from "./playback";
import { Marker, StepProgress } from "./step-player";

/** A step player's progress kept in an observable field, as a view's state model keeps it. */
export class TestProgress implements StepProgress {
  marker: Marker;

  constructor(marker: Marker = 0) {
    this.marker = marker;
    makeObservable(this, { marker: observable, setMarker: action });
  }

  setMarker(marker: Marker) {
    this.marker = marker;
  }
}

/** A view's animation settings in observable fields, as a view's state model keeps them. */
export class TestSettings implements Animated {
  animate: boolean;
  speed: Speed;

  constructor({ animate = true, speed = SPEED.normal }: Partial<PlaybackSettings> = {}) {
    this.animate = animate;
    this.speed = speed;
    makeObservable(this, { animate: observable, speed: observable, setAnimate: action, setSpeed: action });
  }

  setAnimate(animate: boolean) {
    this.animate = animate;
  }

  setSpeed(speed: Speed) {
    this.speed = speed;
  }
}

/** Makes `prefers-reduced-motion: reduce` match, or not, for the step player. */
export function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => ({ matches: reduce }),
  });
}

/** Removes the `matchMedia` that `setReducedMotion` added, since jsdom has none. */
export function clearReducedMotion() {
  Reflect.deleteProperty(window, "matchMedia");
}
