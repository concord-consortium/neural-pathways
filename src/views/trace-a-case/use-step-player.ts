import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scene } from "../../core/network-diagram/scene";
import { RunningStep, sceneAt, Step, stepDuration } from "./step-timeline";

export interface StepPlayer {
  /** Steps completed, 0–4. */
  stepsDone: number;
  /** The step whose button shows as pressed: the one playing, else the last one done (0 for none). */
  shownStep: number;
  scene: Scene;
  /** Jumps to the step before `step`, then plays `step`. Pressing the step shown replays it. */
  play: (step: Step) => void;
  reset: () => void;
}

interface PlayerState {
  /** The conversation this progress belongs to. */
  key: string | undefined;
  stepsDone: number;
  running?: RunningStep;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays Trace a Case's steps on a requestAnimationFrame clock. Progress isn't saved: it starts
 * over when `resetKey` (the conversation) changes, and a step still playing is dropped when the
 * view unmounts. `columnSizes` must be a stable array.
 */
export function useStepPlayer(columnSizes: readonly number[], resetKey: string | undefined): StepPlayer {
  const [state, setState] = useState<PlayerState>({ key: resetKey, stepsDone: 0 });
  const frame = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    if (frame.current !== undefined) {
      cancelAnimationFrame(frame.current);
      frame.current = undefined;
    }
  }, []);

  // Stop a playing step when the conversation changes and when the view unmounts.
  useEffect(() => stop, [resetKey, stop]);

  const play = useCallback((step: Step) => {
    stop();
    if (prefersReducedMotion()) {
      setState({ key: resetKey, stepsDone: step });
      return;
    }
    const duration = stepDuration(step, columnSizes);
    setState({ key: resetKey, stepsDone: step - 1, running: { step, t: 0 } });
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        frame.current = undefined;
        setState({ key: resetKey, stepsDone: step });
        return;
      }
      setState({ key: resetKey, stepsDone: step - 1, running: { step, t } });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [columnSizes, resetKey, stop]);

  const reset = useCallback(() => {
    stop();
    setState({ key: resetKey, stepsDone: 0 });
  }, [resetKey, stop]);

  // Progress belongs to one conversation: discard it when the conversation changes, so returning
  // to an earlier one starts over rather than bringing its old progress back.
  if (state.key !== resetKey) {
    setState({ key: resetKey, stepsDone: 0 });
  }
  const { stepsDone, running } = state.key === resetKey ? state : { stepsDone: 0, running: undefined };
  const scene = useMemo(() => sceneAt(columnSizes, stepsDone, running), [columnSizes, stepsDone, running]);
  return { stepsDone, shownStep: running?.step ?? stepsDone, scene, play, reset };
}
