import { emptyScene, fullScene, Scene } from "../../core/network-diagram/scene";
import { Marker } from "../../core/steps/step-player";
import { flightDuration } from "./flight";

/**
 * How strongly the hidden neurons are spotlit while copies of them fly out of the network:
 * everything else fades to half strength. During a collection, the lifted column's copies fade with
 * it.
 */
export const SPOTLIGHT = 0.5;

/** What Extract Pathways draws at one moment. The timelines build these; ExtractDrawing draws them. */
export interface ExtractScene {
  /** The network: its fills, edges, answer and spotlight. */
  network: Scene;
  /** Which conversation the network shows, 1-based; undefined until the first collection starts. */
  shown: number | undefined;
  /** "Conversation n" over the network, and how far its bounce has got, 0–1. */
  label: { n: number; bounce: number } | undefined;
  /** The lifted column, once its copies have left. `flight` is ms since they left. */
  lifted: { flight: number; opacity: number; labelOpacity: number } | undefined;
  /** The deck's columns in order. `flight` is ms since that column's copies left. */
  deck: { conversation: number; flight: number }[];
}

/** How many hidden units there are: every layer but the first and last. */
export function hiddenCount(columnSizes: readonly number[]): number {
  return columnSizes.slice(1, -1).reduce((sum, n) => sum + n, 0);
}

/**
 * The scene resting at `marker`, with nothing running: the blank network; then the lifted
 * column; then the last conversation collected in full, under its label, with the deck. Once a
 * conversation is collected, the hidden neurons stay spotlit, and the lifted column's copies faded,
 * as its flight left them, until the next collection brings them back.
 */
export function restScene(columnSizes: readonly number[], marker: Marker): ExtractScene {
  const collected = Math.max(0, marker - 1);
  const landed = flightDuration(hiddenCount(columnSizes));
  const spotlight = collected > 0 ? SPOTLIGHT : 0;
  const network = collected > 0 ? fullScene(columnSizes) : emptyScene(columnSizes);
  network.hiddenLayerSpotlight = spotlight;
  return {
    network,
    shown: collected > 0 ? collected : undefined,
    label: collected > 0 ? { n: collected, bounce: 1 } : undefined,
    lifted: marker >= 1 ? { flight: landed, opacity: 1 - spotlight, labelOpacity: 1 } : undefined,
    deck: Array.from({ length: collected }, (_, c) => ({ conversation: c + 1, flight: landed })),
  };
}
