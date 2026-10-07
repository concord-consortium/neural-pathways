import { clamp01, cubicBezier, ease } from "../../core/network-diagram/easing";
import { emptyScene, Scene } from "../../core/network-diagram/scene";

/**
 * Trace a Case's four steps as a function of time, at the prototype's "Med" speed
 * (neural-net-maker index.html: fillInputs, runFan, revealAnswer). Step s fills column s − 1;
 * steps 2–4 first play the fan of edges into it, one source unit at a time.
 */
export const STEPS = [1, 2, 3, 4] as const;
export type Step = (typeof STEPS)[number];

export interface RunningStep {
  step: Step;
  /** Milliseconds since the step started. */
  t: number;
}

/** Step 1: input unit i starts filling at i × FILL_GAP ms. */
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

/** When each of a fan's n units ends, in ms from the start of the step. */
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

export function stepDuration(step: Step, columnSizes: readonly number[]): number {
  if (step === 1) {
    return (columnSizes[0] - 1) * FILL_GAP + FILL_DURATION;
  }
  const ends = unitEnds(columnSizes[step - 2]);
  const settle = step === columnSizes.length ? ANSWER_DELAY + ANSWER_DURATION : FILL_DURATION;
  return ends[ends.length - 1] + settle;
}

/** The scene with `stepsDone` steps complete and `running` part way. */
export function sceneAt(columnSizes: readonly number[], stepsDone: number, running?: RunningStep): Scene {
  const scene = emptyScene(columnSizes);
  for (let step = 1; step <= stepsDone; step++) {
    applyStep(scene, columnSizes, step as Step, Infinity);
  }
  if (running) {
    applyStep(scene, columnSizes, running.step, running.t);
  }
  return scene;
}

function applyStep(scene: Scene, columnSizes: readonly number[], step: Step, t: number) {
  if (step === 1) {
    scene.nodeFill[0] = scene.nodeFill[0].map((_, i) => ease(progress(t, i * FILL_GAP, FILL_DURATION)));
    return;
  }
  const gap = step - 2;
  const target = step - 1;
  const ends = unitEnds(columnSizes[gap]);
  scene.edgeDraw[gap] = ends.map((end, k) => {
    const p = progress(t, end - unitDuration(k), unitDuration(k));
    // Near half over the unit's first half, far half over its second, each eased.
    return p <= 0.5 ? edgeEase(p * 2) / 2 : 0.5 + edgeEase(p * 2 - 1) / 2;
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
