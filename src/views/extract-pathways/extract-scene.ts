import { emptyScene, fullScene, Scene } from "../../core/network-diagram/scene";
import { Marker } from "../../core/steps/step-player";
import { columnsInSet, setCount, setOffset } from "./deck-layout";
import { flightDuration } from "./flight";

/**
 * How strongly the hidden neurons are spotlit while copies of them fly out of the network:
 * everything else fades to half strength.
 */
export const SPOTLIGHT = 0.5;

/** One set of the deck. */
export interface DeckSetScene {
  /** Where it sits once the deck is centered, in deck radii right of where its columns are drawn. */
  offset: number;
  /** How far it still is from there, in px: negative while it closes up from short of its place. */
  shift: number;
  opacity: number;
  /** How many of its columns are in. */
  columns: number;
  /** The last of those columns' opacity, while it fades in. */
  lastOpacity: number;
}

/** The deck once Collect All Conversations has started. ExtractDrawing's DeckDrawing draws it. */
export interface DeckScene {
  /** How far the deck has moved from the left strip toward the middle of its room, 0–1. */
  centered: number;
  /**
   * How far Extract Pathways has slid it left, until its middle is on the canvas's left edge, 0–1;
   * 0 until Extract Pathways is built.
   */
  slide: number;
  /** Every set in, set 0 (in front) first. */
  sets: DeckSetScene[];
  /** Set 0's columns still sliding in: how far from their place, in px, and their opacity. */
  arriving: { column: number; dx: number; opacity: number }[];
  /** How deep the faces' shading is: see deck-drawing's `shading`. */
  shade: number;
  /** "Conversation n" beside column n − 1 of set 0, while it shows. */
  labels: { column: number; opacity: number }[];
  /** "n Conversations" over the deck, once set 0 is full. */
  count: { n: number; opacity: number } | undefined;
  /** How many conversations the drawing's description counts as collected. */
  collected: number;
  /** Whether the deck is finished. */
  done: boolean;
}

/** What Extract Pathways draws at one moment. The timelines build these; ExtractDrawing draws them. */
export interface ExtractScene {
  /** The network: its fills, edges, answer and spotlight. */
  network: Scene;
  /** The network's opacity as a whole: 0 once Collect All has hidden it. */
  networkOpacity: number;
  /** Which conversation the network shows, 1-based; undefined until the first collection starts. */
  shown: number | undefined;
  /** "Conversation n" over the network, and how far its bounce has gone, 0–1. */
  label: { n: number; bounce: number } | undefined;
  /** The lifted column, once its copies have left. `flight` is ms since they left. */
  lifted: { flight: number; opacity: number; labelOpacity: number } | undefined;
  /**
   * The collections so far, in order: the conversation each adds to the deck, and `flight`, ms since
   * its copies left. Empty once Collect All has started, when `deck` holds their columns.
   */
  collections: { conversation: number; flight: number }[];
  /** The deck, in sets, once Collect All has started; the columns collected by hand are set 0's first. */
  deck: DeckScene | undefined;
}

/** How many hidden units there are: every layer but the first and last. */
export function hiddenCount(columnSizes: readonly number[]): number {
  return columnSizes.slice(1, -1).reduce((sum, n) => sum + n, 0);
}

/**
 * The scene resting at `marker`, with nothing running: the blank network; then the lifted
 * column; then the last conversation collected in full, under its label, with the deck, spotlit as
 * its flight left it (see `collectSceneAt`). For markers 0 to 11; from the deck on, the timeline
 * rests in `deckRestScene`.
 */
export function restScene(columnSizes: readonly number[], marker: Marker): ExtractScene {
  const collected = Math.max(0, marker - 1);
  const landed = flightDuration(hiddenCount(columnSizes));
  const spotlight = collected > 0 ? SPOTLIGHT : 0;
  const network = collected > 0 ? fullScene(columnSizes) : emptyScene(columnSizes);
  network.hiddenLayerSpotlight = spotlight;
  return {
    network,
    networkOpacity: 1,
    shown: collected > 0 ? collected : undefined,
    label: collected > 0 ? { n: collected, bounce: 1 } : undefined,
    lifted: marker >= 1 ? { flight: landed, opacity: 1 - spotlight, labelOpacity: 1 } : undefined,
    collections: Array.from({ length: collected }, (_, c) => ({ conversation: c + 1, flight: landed })),
    deck: undefined,
  };
}

/** The finished deck of `size` columns, at rest. */
export function finishedDeck(size: number): DeckScene {
  const sets = setCount(size);
  return {
    centered: 1,
    slide: 0,
    sets: Array.from({ length: sets }, (_, set) => ({
      offset: setOffset(set, size), shift: 0, opacity: 1,
      columns: columnsInSet(set, size), lastOpacity: 1,
    })),
    arriving: [],
    shade: Math.max(0, sets - 1),
    labels: [],
    count: { n: size, opacity: 1 },
    collected: size,
    done: true,
  };
}

/** The scene resting at the deck: the finished deck beside the lifted column at full strength, and no network. */
export function deckRestScene(columnSizes: readonly number[], size: number): ExtractScene {
  const scene = restScene(columnSizes, 1);
  scene.networkOpacity = 0;
  scene.deck = finishedDeck(size);
  return scene;
}
