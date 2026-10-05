import { emptyScene, fullScene, Scene } from "../../core/network-diagram/scene";
import { flightDuration } from "./flight";

/** What Extract Pathways draws at one moment. The timelines build these; ExtractDrawing draws them. */
export interface ExtractScene {
  /** The network: its fills, edges, answer and dim. */
  network: Scene;
  /** Which conversation the network shows, 1-based; undefined before any is collected. */
  shown: number | undefined;
  /** "Conversation n" over the network, and how far its bounce has got, 0–1. */
  label: { n: number; bounce: number } | undefined;
  /** The lifted column, once its copies have left. `flight` is ms since they left. */
  lifted: { flight: number; opacity: number; labelOpacity: number } | undefined;
  /** The deck's columns in order. `flight` is ms since that column's copies left. */
  deck: { conversation: number; flight: number }[];
}

/** How many hidden units there are: every column but the first and last. */
export function hiddenCount(columnSizes: readonly number[]): number {
  return columnSizes.slice(1, -1).reduce((sum, n) => sum + n, 0);
}

/**
 * The scene with `done` steps done and nothing running: the blank network; then the lifted
 * column; then the last conversation collected in full, under its label, with the deck.
 */
export function restScene(columnSizes: readonly number[], done: number): ExtractScene {
  const collected = Math.max(0, done - 1);
  const landed = flightDuration(hiddenCount(columnSizes));
  return {
    network: collected > 0 ? fullScene(columnSizes) : emptyScene(columnSizes),
    shown: collected > 0 ? collected : undefined,
    label: collected > 0 ? { n: collected, bounce: 1 } : undefined,
    lifted: done >= 1 ? { flight: landed, opacity: 1, labelOpacity: 1 } : undefined,
    deck: Array.from({ length: collected }, (_, c) => ({ conversation: c + 1, flight: landed })),
  };
}
