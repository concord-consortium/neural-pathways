import { clamp01, ease, flightEaseX, flightEaseY } from "../../core/network-diagram/easing";
import { FILL_DURATION } from "../../core/network-diagram/forward-pass-phases";
import { Point } from "../../core/network-diagram/layout";

// Step 1's timings are the prototype's at its "Medium" speed (prototype lines 12897-12923). Each
// input neuron gets a pass, back to back, sending it a chip for each of the message's words. Each
// pass is 0.7 times the one before, down to a floor.
const DUR_FIRST = 1400;
const DUR_DECAY = 0.7;
const DUR_MIN = 170;
/** Where in a pass the nearest chip lands; the farthest lands at the pass's end. */
const ARRIVE_FIRST = 0.7;
/** The share of a chip's flight after which it fades. */
const FADE_AT = 0.86;
/** A chip's scale when it has faded out. */
const END_SCALE = 0.12;

export function passDuration(unit: number): number {
  // Rounded to a millionth of a ms so that 1400 x 0.7 is 980, not 979.9999999999999.
  const decayed = Math.round(DUR_FIRST * DUR_DECAY ** unit * 1e6) / 1e6;
  return Math.max(DUR_MIN, decayed);
}

/** ms from the start of Step 1 to the start of `unit`'s pass. */
export function passStart(unit: number): number {
  let start = 0;
  for (let i = 0; i < unit; i++) {
    start += passDuration(i);
  }
  return start;
}

/** Step 1 ends once the last input has eased in after the last pass. */
export function step1Duration(inputCount: number): number {
  return passStart(inputCount) + FILL_DURATION;
}

/** ms from the start of Step 1 at which a pass's chip `order` (0 for the nearest) of `wordCount` lands on `unit`. */
export function landingTime(unit: number, order: number, wordCount: number): number {
  const duration = passDuration(unit);
  const share = wordCount > 1 ? ARRIVE_FIRST + (1 - ARRIVE_FIRST) * (order / (wordCount - 1)) : 1;
  return passStart(unit) + duration * share;
}

/** Each input's fill, 0 to 1: a share per landed chip, each easing in over FILL_DURATION. */
export function inputFillAt(t: number, inputCount: number, wordCount: number): number[] {
  const fills: number[] = [];
  for (let unit = 0; unit < inputCount; unit++) {
    let fill = 0;
    for (let order = 0; order < wordCount; order++) {
      fill += (1 / wordCount) * ease(clamp01((t - landingTime(unit, order, wordCount)) / FILL_DURATION));
    }
    // Summing the shares can leave it a hair off 1 once everything has landed.
    fills.push(fill > 1 - 1e-9 ? 1 : fill);
  }
  return fills;
}

export interface ChipPlacement {
  word: number;
  unit: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

/**
 * The chips in flight `t` ms into Step 1. `words` are word centers and `inputs` input-neuron
 * centers, top to bottom, in one coordinate space. Within a pass the chips land nearest first.
 * A chip flies from the pass's start until it lands, and fades over the last stretch of its flight.
 */
export function chipsAt(t: number, words: readonly Point[], inputs: readonly Point[]): ChipPlacement[] {
  const chips: ChipPlacement[] = [];
  inputs.forEach((input, unit) => {
    const start = passStart(unit);
    if (t < start || t >= start + passDuration(unit)) {
      return;
    }
    const byDistance = words
      .map((point, word) => ({ word, distance: Math.hypot(input.x - point.x, input.y - point.y) }))
      .sort((a, b) => a.distance - b.distance || a.word - b.word);
    byDistance.forEach(({ word }, order) => {
      const land = landingTime(unit, order, words.length);
      if (t >= land) {
        return;
      }
      const p = (t - start) / (land - start);
      const from = words[word];
      const fade = p <= FADE_AT ? 0 : (p - FADE_AT) / (1 - FADE_AT);
      chips.push({
        word,
        unit,
        x: from.x + (input.x - from.x) * flightEaseX(p),
        y: from.y + (input.y - from.y) * flightEaseY(p),
        opacity: 1 - fade,
        scale: 1 - (1 - END_SCALE) * fade,
      });
    });
  });
  return chips;
}
