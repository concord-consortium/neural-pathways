import { clamp01, ease } from "../../core/network-diagram/easing";
import { DIM, ExtractScene, hiddenCount, restScene } from "./extract-scene";
import { flightDuration } from "./flight";

// The prototype's runExtract, EX_STAGE0_ONLY branch (neural-net-maker index.html), at Med.
export const DIM_MS = 350;
/** A beat between the dim and the flight. */
export const DIM_HOLD = 200;
export const UNDIM_MS = 320;
/** After the last copy settles, before the network comes back. */
const LABEL_WAIT = 260;
const END_HOLD = 120;

/** `a` eased toward `b` as `t` runs from `start` over `duration` ms; `a` before, `b` after. */
export function easeBetween(a: number, b: number, t: number, start: number,
  duration: number): number {
  return a + (b - a) * ease(clamp01((t - start) / duration));
}

export function setupDuration(columnSizes: readonly number[]): number {
  return DIM_MS + DIM_HOLD + flightDuration(hiddenCount(columnSizes)) + LABEL_WAIT + UNDIM_MS
    + END_HOLD;
}

/**
 * Setup, `t` ms in: everything but the hidden neurons dims, copies of them fly into the
 * lifted column, then the network comes back and the column's label fades in.
 */
export function setupSceneAt(columnSizes: readonly number[], t: number): ExtractScene {
  const scene = restScene(columnSizes, 0);
  const flightStart = DIM_MS + DIM_HOLD;
  const landed = flightDuration(hiddenCount(columnSizes));
  const undimAt = flightStart + landed + LABEL_WAIT;
  scene.network.dim = t < undimAt
    ? easeBetween(1, DIM, t, 0, DIM_MS)
    : easeBetween(DIM, 1, t, undimAt, UNDIM_MS);
  if (t >= flightStart) {
    scene.lifted = {
      flight: Math.min(t - flightStart, landed),
      opacity: 1,
      labelOpacity: easeBetween(0, 1, t, undimAt, UNDIM_MS),
    };
  }
  return scene;
}
