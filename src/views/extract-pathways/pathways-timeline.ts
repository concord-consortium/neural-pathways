import { clamp01 } from "../../core/network-diagram/easing";
import { moveEase } from "./collect-all-timeline";
import { deckRestScene, ExtractScene, PathwaysScene } from "./extract-scene";
import { landedCounts, particlePlan, PARTICLES_MS } from "./particles";
import { barLengths, Loadings, PATHWAYS } from "./pathways-layout";
import { easeBetween } from "./setup-timeline";
import { transitionAt } from "./transitions";

// The timings below are the prototype's, in ms at its "Med" speed, so each can be checked against
// its source: particleStage, flyParticles, ptWire, pathwayStep and buildLines.
// src/views/README.md says where the prototype is.

const DECK_SLIDE_MS = 1400;
/** The lifted column answers the deck's move rather than sharing it. */
const COLUMN_DELAY = 400;
const COLUMN_SLIDE_MS = 1100;
const PARTICLES_AT = Math.max(DECK_SLIDE_MS, COLUMN_DELAY + COLUMN_SLIDE_MS) + 200;
const BARS_DONE = PARTICLES_AT + PARTICLES_MS;
const PATHWAYS_REST = 460;
/** Within a pathway: the beat before its copies lift, their flight, and the spread of their leaving. */
const LIFT = 200;
export const COPY_FLY_MS = 760;
const COPY_LEAD = 380;
/** A copy fades over the last 22% of its flight, starting 82% of the way. */
const COPY_FADE_AT = Math.round(COPY_FLY_MS * 0.82);
const COPY_FADE_MS = Math.round(COPY_FLY_MS * 0.22);
/** A copy is gone this long after its pathway starts. */
const COPIES_GONE = LIFT + COPY_FLY_MS + COPY_LEAD + 80;
/** How small a copy is when it reaches its box. */
export const COPY_END_SCALE = 0.18;
const PATHWAY_BACK = 320;
const PATHWAY_HOLD = 460;
export const PATHWAY_MS = LIFT + COPY_FLY_MS + COPY_LEAD + PATHWAY_BACK + PATHWAY_HOLD;
const MUTE_MS = 320;
const BOX_STEP_MS = 140;
const KICK_MS = 300;
const LINES_AT = BARS_DONE + PATHWAYS_REST + PATHWAYS * PATHWAY_MS + PATHWAY_BACK;
const LINES_MS = 520;
export const EXTRACT_MS = LINES_AT + LINES_MS;

/** When pathway `pathway`'s turn starts. */
export function pathwayStart(pathway: number): number {
  return BARS_DONE + PATHWAYS_REST + pathway * PATHWAY_MS;
}

/** When neuron `neuron` of `neurons` sends its copy, after its pathway's turn starts. */
export function copyLeaves(neuron: number, neurons: number): number {
  return LIFT + Math.round((neuron * COPY_LEAD) / neurons);
}

function pathwaysAt(loadings: Loadings, t: number): PathwaysScene {
  const neurons = loadings.length;
  const slide = moveEase(clamp01((t - COLUMN_DELAY) / COLUMN_SLIDE_MS));
  const particles = t >= PARTICLES_AT && t < BARS_DONE ? t - PARTICLES_AT : undefined;
  let bars: PathwaysScene["bars"];
  if (t >= PARTICLES_AT) {
    const landed = particles === undefined ? undefined : landedCounts(loadings, particles);
    const { need } = particlePlan(loadings);
    bars = barLengths(loadings).map((_, bar) => {
      const grays = pathwayStart(bar % PATHWAYS) + LIFT;
      return {
        grown: landed ? Math.min(1, landed[bar] / need[bar]) : 1,
        muted: transitionAt(0, [
          { start: grays, duration: MUTE_MS, to: 1 },
          { start: LINES_AT, duration: MUTE_MS, to: 0 },
        ], t),
      };
    });
  }
  let flying: PathwaysScene["flying"];
  const boxes = Array.from({ length: PATHWAYS }, (_, pathway) => {
    const start = pathwayStart(pathway);
    if (t >= start + LIFT && t < start + COPIES_GONE) {
      flying = {
        pathway,
        copies: Array.from({ length: neurons }, (__, neuron) => {
          const leaves = start + copyLeaves(neuron, neurons);
          return {
            progress: clamp01((t - leaves) / COPY_FLY_MS),
            opacity: 1 - easeBetween(0, 1, t, leaves + COPY_FADE_AT, COPY_FADE_MS),
          };
        }),
      };
    }
    const arrivals = Array.from({ length: neurons }, (__, neuron) => start + copyLeaves(neuron, neurons) + COPY_FLY_MS);
    const landed = arrivals.filter(arrival => t >= arrival);
    const last = landed[landed.length - 1];
    return {
      opacity: transitionAt(0, arrivals.map((arrival, neuron) => (
        { start: arrival, duration: BOX_STEP_MS, to: (neuron + 1) / neurons }
      )), t),
      kick: last !== undefined && t - last < KICK_MS ? (t - last) / KICK_MS : undefined,
    };
  });
  return {
    slide,
    particles,
    bars,
    flying,
    boxes,
    lines: easeBetween(0, 1, t, LINES_AT, LINES_MS),
    done: t >= EXTRACT_MS,
  };
}

/**
 * Extract Pathways, `t` ms in, from the finished deck of `size`, with the bars of `loadings`: the deck
 * slides half off the canvas and the lifted column follows; particles fly from the deck's faces onto
 * the loading bars; each pathway's bars send copies to its box, one pathway at a time; then the lines
 * fade in.
 */
export function extractPathwaysSceneAt(
  columnSizes: readonly number[], size: number, loadings: Loadings, t: number,
): ExtractScene {
  const scene = deckRestScene(columnSizes, size);
  scene.deck!.slide = moveEase(clamp01(t / DECK_SLIDE_MS));
  scene.pathways = pathwaysAt(loadings, t);
  return scene;
}
