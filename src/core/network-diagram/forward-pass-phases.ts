import { clamp01, cubicBezier, ease } from "./easing";
import { emptyScene, Scene } from "./scene";

/**
 * The four phases of one conversation's forward pass through the network, as a function of time,
 * at the prototype's "Med" speed (neural-net-maker index.html: fillInputs, runFan, revealAnswer).
 * Phase p fills column p − 1; phases 2–4 first play the fan of edges into it, one source unit at a
 * time. A view can play each phase as a segment of its own, or several within one segment.
 */
export const PHASES = [1, 2, 3, 4] as const;
export type Phase = (typeof PHASES)[number];

/** Phase `n`. Throws for a number that isn't a phase, since asking for one is a bug. */
export function toPhase(n: number): Phase {
  const phase = PHASES.find(p => p === n);
  if (phase === undefined) {
    throw new RangeError(`There is no phase ${n}`);
  }
  return phase;
}

/** One frame of a phase playing: the phase, and the time into it. */
export interface PhaseFrame {
  phase: Phase;
  /** Milliseconds since the phase started. */
  t: number;
}

/** Phase 1: input unit i starts filling at i × FILL_GAP ms. */
const FILL_GAP = 55;
/** How long a gauge takes to ease to its new level. */
export const FILL_DURATION = 180;
const UNIT_FIRST = 900;
const UNIT_DECAY = 0.76;
const UNIT_MIN = 150;
/** After the last fan unit, the answer waits this long, then pops over ANSWER_DURATION. */
export const ANSWER_DELAY = 60;
export const ANSWER_DURATION = 460;
const edgeEase = cubicBezier(0.3, 0.05, 0.4, 1);

/** How long unit k of a fan takes: each unit is quicker than the one before, down to a floor. */
export function unitDuration(k: number): number {
  return Math.max(UNIT_MIN, UNIT_FIRST * UNIT_DECAY ** k);
}

/** When each of a fan's n units ends, in ms from the start of the phase. */
function unitEnds(n: number): number[] {
  const ends: number[] = [];
  let end = 0;
  for (let k = 0; k < n; k++) {
    end += unitDuration(k);
    ends.push(end);
  }
  return ends;
}

function progress(t: number, start: number, duration: number): number {
  return clamp01((t - start) / duration);
}

/**
 * How far a unit's edges are drawn when `unitProgress`, 0–1, of the unit's time has passed: the
 * near half eased over the first half of the time, the far half over the second.
 */
export function edgeDrawAt(unitProgress: number): number {
  return unitProgress <= 0.5
    ? edgeEase(unitProgress * 2) / 2
    : 0.5 + edgeEase(unitProgress * 2 - 1) / 2;
}

export function phaseDuration(phase: Phase, columnSizes: readonly number[]): number {
  if (phase === 1) {
    return (columnSizes[0] - 1) * FILL_GAP + FILL_DURATION;
  }
  const ends = unitEnds(columnSizes[phase - 2]);
  const settle = phase === columnSizes.length ? ANSWER_DELAY + ANSWER_DURATION : FILL_DURATION;
  return ends[ends.length - 1] + settle;
}

/** The scene with `phasesDone` phases complete, and the phase in `frame` drawn up to its time. */
export function sceneAt(columnSizes: readonly number[], phasesDone: number, frame?: PhaseFrame): Scene {
  const scene = emptyScene(columnSizes);
  for (const phase of PHASES) {
    if (phase > phasesDone) {
      break;
    }
    applyPhase(scene, columnSizes, phase, Infinity);
  }
  if (frame) {
    applyPhase(scene, columnSizes, frame.phase, frame.t);
  }
  return scene;
}

function applyPhase(scene: Scene, columnSizes: readonly number[], phase: Phase, t: number) {
  if (phase === 1) {
    scene.nodeFill[0] = scene.nodeFill[0].map((_, i) => ease(progress(t, i * FILL_GAP, FILL_DURATION)));
    return;
  }
  const gap = phase - 2;
  const target = phase - 1;
  const ends = unitEnds(columnSizes[gap]);
  scene.edgeDraw[gap] = ends.map((end, k) => {
    const unitProgress = progress(t, end - unitDuration(k), unitDuration(k));
    return edgeDrawAt(unitProgress);
  });
  // Each unit that lands adds its share to every target gauge, eased in. Summed before dividing
  // so a finished fan comes to exactly 1.
  const landed = ends.reduce((sum, end) => sum + ease(progress(t, end, FILL_DURATION)), 0);
  scene.nodeFill[target] = scene.nodeFill[target].map(() => landed / ends.length);
  scene.weightLabel[gap] = t >= unitDuration(0) / 2;
  if (target === columnSizes.length - 1) {
    scene.answer = progress(t, ends[ends.length - 1] + ANSWER_DELAY, ANSWER_DURATION);
  }
}
