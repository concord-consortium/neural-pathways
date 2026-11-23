import { clamp01 } from "../../core/network-diagram/easing";
import { ExtractScene } from "./extract-scene";

/**
 * How much of the loading legend shows while the pathways' lines draw: it slides open as the lines
 * do and fades in a little behind them. `width` is a fraction of its natural width. Undefined
 * until the lines start, when the legend stays out of the head's layout.
 */
export function loadingLegendReveal(scene: ExtractScene): { width: number; opacity: number } | undefined {
  const pathways = scene.pathways;
  if (!pathways || pathways.lines === 0) {
    return undefined;
  }
  if (pathways.done) {
    return { width: 1, opacity: 1 };
  }
  return { width: pathways.lines, opacity: clamp01((pathways.lines - 0.35) / 0.7) };
}
