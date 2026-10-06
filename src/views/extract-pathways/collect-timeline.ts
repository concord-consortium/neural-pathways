import { clamp01 } from "../../core/network-diagram/easing";
import {
  ANSWER_DURATION, edgeDrawAt, Phase, phaseDuration, PHASES, sceneAt as passSceneAt,
} from "../../core/network-diagram/forward-pass-phases";
import { fullScene, Scene } from "../../core/network-diagram/scene";
import { ExtractScene, hiddenCount, restScene, SPOTLIGHT } from "./extract-scene";
import { flightDuration } from "./flight";
import { DIM_HOLD, DIM_MS, easeBetween, UNDIM_MS } from "./setup-timeline";

// The prototype's collectOne, runSteps, setConversation and flyColumn (neural-net-maker
// index.html), at Med.

/** How a collection runs its conversation through the network. */
export type CollectVersion = "replay" | "swap" | "quick";

/** "Conversation n" drops in and settles over this long; the quick swap's is 0.7 of it. */
const BOUNCE_MS = 520;
const QUICK_BOUNCE_MS = Math.round(BOUNCE_MS * 0.7);

// Replay: the forward pass's phase 1 at its own speed, then the fans faster, as a reminder of
// Trace a Case.
const REPLAY_START = 540;
const REPLAY_FAN_SPEED = 0.26;
const PHASE_GAP = 110;
const PHASES_REST = 700;

// Swap: drain a layer at a time, hold on the blank network, refill a layer at a time.
const DRAIN_GAP = 12;
const DRAIN_LAYER_GAP = 60;
const CLEAR_DELAY = 20;
const EMPTY_HOLD = 420;
const REFILL_GAP_SLOW = 30;
const SWEEP_DELAY = 30;
const SWEEP_MS = 360;
const SWAP_TAIL = 60;

// Quick swap: everything clears at once, then refills quickly with the lines snapped in.
const REFILL_GAP = 16;
const SNAP_DELAY = 20;
const QUICK_TAIL = 40;

/** After a swap, before the flight. */
const NEXT_HOLD = 550;

export function collectVersion(n: number): CollectVersion {
  return n === 1 ? "replay" : n <= 3 ? "swap" : "quick";
}

interface PhaseSlot {
  phase: Phase;
  start: number;
  duration: number;
  speed: number;
}

function replaySlots(columnSizes: readonly number[]): PhaseSlot[] {
  const slots: PhaseSlot[] = [];
  let at = REPLAY_START;
  for (const phase of PHASES) {
    const speed = phase === 1 ? 1 : REPLAY_FAN_SPEED;
    const duration = phaseDuration(phase, columnSizes) * speed;
    slots.push({ phase, start: at, duration, speed });
    at += duration + PHASE_GAP;
  }
  return slots;
}

function replayNetwork(columnSizes: readonly number[], t: number): Scene {
  let phasesDone = 0;
  for (const slot of replaySlots(columnSizes)) {
    if (t < slot.start) {
      break;
    }
    if (t < slot.start + slot.duration) {
      return passSceneAt(columnSizes, phasesDone, { phase: slot.phase, t: (t - slot.start) / slot.speed });
    }
    phasesDone = slot.phase;
  }
  return passSceneAt(columnSizes, phasesDone);
}

interface SwapPlan {
  /** [layer][unit]: when each gauge empties. */
  drainAt: number[][];
  /** [gap]: when the lines leaving each layer clear. */
  clearAt: number[];
  /** When the network is blank and takes the new conversation. */
  blank: number;
  /** [layer][unit]: when each gauge fills again. */
  fillAt: number[][];
  /** [gap]: when the lines leaving each layer start to sweep in. */
  sweepAt: number[];
  answerAt: number;
  end: number;
}

function swapPlan(columnSizes: readonly number[]): SwapPlan {
  let at = 0;
  const drainAt: number[][] = [];
  const clearAt: number[] = [];
  for (const n of columnSizes) {
    drainAt.push(Array.from({ length: n }, (_, i) => at + i * DRAIN_GAP));
    at += (n - 1) * DRAIN_GAP;
    clearAt.push(at + CLEAR_DELAY);
    at += DRAIN_LAYER_GAP;
  }
  const blank = at;
  at += EMPTY_HOLD;
  const fillAt: number[][] = [];
  const sweepAt: number[] = [];
  for (const n of columnSizes) {
    fillAt.push(Array.from({ length: n }, (_, i) => at + i * REFILL_GAP_SLOW));
    at += (n - 1) * REFILL_GAP_SLOW;
    sweepAt.push(at + SWEEP_DELAY);
    at += SWEEP_MS;
  }
  return { drainAt, clearAt, blank, fillAt, sweepAt, answerAt: at, end: at + SWAP_TAIL };
}

function swapNetwork(columnSizes: readonly number[], plan: SwapPlan, t: number): Scene {
  const scene = fullScene(columnSizes);
  if (t < plan.blank) {
    scene.nodeFill = plan.drainAt.map(times => times.map(at => (t >= at ? 0 : 1)));
    scene.edgeDraw = scene.edgeDraw.map((gap, g) => gap.map(() => (t >= plan.clearAt[g] ? 0 : 1)));
    return scene;
  }
  scene.nodeFill = plan.fillAt.map(times => times.map(at => (t >= at ? 1 : 0)));
  scene.edgeDraw = scene.edgeDraw.map((gap, g) => (
    gap.map(() => edgeDrawAt(clamp01((t - plan.sweepAt[g]) / SWEEP_MS)))
  ));
  scene.answer = clamp01((t - plan.answerAt) / ANSWER_DURATION);
  return scene;
}

interface QuickPlan {
  fillAt: number[][];
  snapAt: number[];
  end: number;
}

function quickPlan(columnSizes: readonly number[]): QuickPlan {
  let at = 0;
  const fillAt: number[][] = [];
  const snapAt: number[] = [];
  for (const n of columnSizes) {
    fillAt.push(Array.from({ length: n }, (_, i) => at + i * REFILL_GAP));
    at += (n - 1) * REFILL_GAP;
    snapAt.push(at + SNAP_DELAY);
    at += REFILL_GAP;
  }
  return { fillAt, snapAt, end: at + QUICK_TAIL };
}

function quickNetwork(columnSizes: readonly number[], plan: QuickPlan, t: number): Scene {
  const scene = fullScene(columnSizes);
  scene.nodeFill = plan.fillAt.map(times => times.map(at => (t >= at ? 1 : 0)));
  scene.edgeDraw = scene.edgeDraw.map((gap, g) => gap.map(() => (t >= plan.snapAt[g] ? 1 : 0)));
  scene.answer = t >= plan.end ? 1 : 0;
  return scene;
}

/**
 * When the network part begins. The first conversation follows Setup, which leaves no spotlight on
 * the network. Every later one first lifts the spotlight the last flight left, bringing the lifted
 * column back with it.
 */
function networkStart(n: number): number {
  return n === 1 ? 0 : UNDIM_MS;
}

/** When the flight's dim begins: after the network part and its hold. */
function flightStart(columnSizes: readonly number[], n: number): number {
  switch (collectVersion(n)) {
    case "replay": {
      const last = replaySlots(columnSizes)[PHASES.length - 1];
      return last.start + last.duration + PHASE_GAP + PHASES_REST;
    }
    case "swap":
      return networkStart(n) + swapPlan(columnSizes).end + NEXT_HOLD;
    case "quick":
      return networkStart(n) + quickPlan(columnSizes).end + NEXT_HOLD;
  }
}

export function collectDuration(columnSizes: readonly number[], n: number): number {
  return flightStart(columnSizes, n) + DIM_MS + DIM_HOLD + flightDuration(hiddenCount(columnSizes));
}

/**
 * Collecting conversation `n`, `t` ms in. After the first, it starts by lifting the spotlight the
 * last flight left. Then the network runs the conversation (a replay of the forward pass's phases
 * for the first, a swap for the next two, a quick swap after). Then a spotlight falls on the hidden neurons,
 * fading the rest of the network and the lifted column's copies, while copies of the hidden neurons
 * fly into deck column n. It stays until the next collection, as in the prototype.
 */
export function collectSceneAt(columnSizes: readonly number[], n: number, t: number): ExtractScene {
  const scene = restScene(columnSizes, n);
  const local = t - networkStart(n);
  if (local >= 0) {
    switch (collectVersion(n)) {
      case "replay":
        scene.network = replayNetwork(columnSizes, local);
        scene.shown = n;
        scene.label = { n, bounce: clamp01(local / BOUNCE_MS) };
        break;
      case "swap": {
        const plan = swapPlan(columnSizes);
        scene.network = swapNetwork(columnSizes, plan, local);
        if (local >= plan.blank) {
          scene.shown = n;
          scene.label = { n, bounce: clamp01((local - plan.blank) / BOUNCE_MS) };
        }
        break;
      }
      case "quick":
        scene.network = quickNetwork(columnSizes, quickPlan(columnSizes), local);
        scene.shown = n;
        scene.label = { n, bounce: clamp01(local / QUICK_BOUNCE_MS) };
        break;
    }
  }

  const dimAt = flightStart(columnSizes, n);
  const flyAt = dimAt + DIM_MS + DIM_HOLD;
  const landed = flightDuration(hiddenCount(columnSizes));
  const spotlight = t < networkStart(n)
    ? easeBetween(SPOTLIGHT, 0, t, 0, UNDIM_MS)
    : easeBetween(0, SPOTLIGHT, t, dimAt, DIM_MS);
  scene.network.hiddenLayerSpotlight = spotlight;
  if (scene.lifted) {
    scene.lifted = { ...scene.lifted, opacity: 1 - spotlight };
  }
  if (t >= flyAt) {
    scene.deck.push({ conversation: n, flight: Math.min(t - flyAt, landed) });
  }
  return scene;
}
