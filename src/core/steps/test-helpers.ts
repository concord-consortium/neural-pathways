import { action, makeObservable, observable } from "mobx";
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
