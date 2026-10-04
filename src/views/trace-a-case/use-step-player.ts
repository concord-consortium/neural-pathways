import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Scene } from "../../core/network-diagram/scene";
import { RunningStep, sceneAt, Step, stepDuration } from "./step-timeline";

/** One conversation's progress through the steps, kept by the view. */
export interface StepProgress {
  /** The conversation. A step still playing is dropped when it changes. */
  key: string | undefined;
  /** Steps completed, 0–4. */
  stepsDone: number;
  /** Saves this conversation's steps done. */
  setStepsDone: (stepsDone: number) => void;
}

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

interface Playing {
  /** The conversation the step is playing for. */
  key: string | undefined;
  running: RunningStep;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays Trace a Case's steps on a requestAnimationFrame clock. The steps done are the view's to
 * keep: a step saves the step before when it starts and itself when it ends, so a step still
 * playing is never saved. Changing conversation, or unmounting, drops a step that is playing.
 * `columnSizes` must be a stable array.
 */
export function useStepPlayer(columnSizes: readonly number[], progress: StepProgress): StepPlayer {
  const { key, stepsDone, setStepsDone } = progress;
  const [playing, setPlaying] = useState<Playing | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  // The latest setter, so the callbacks below needn't change when the view passes a new one.
  const setStepsDoneRef = useRef(setStepsDone);
  useLayoutEffect(() => {
    setStepsDoneRef.current = setStepsDone;
  });

  const stop = useCallback(() => {
    if (frame.current !== undefined) {
      cancelAnimationFrame(frame.current);
      frame.current = undefined;
    }
  }, []);

  // Drop a playing step when the conversation changes and when the view unmounts, so coming back
  // to the conversation doesn't bring it back half played. A layout effect, so no frame of the old
  // conversation's step can run, and save, after the change is committed.
  useLayoutEffect(() => () => {
    stop();
    setPlaying(undefined);
  }, [key, stop]);

  const play = useCallback((step: Step) => {
    stop();
    const save = setStepsDoneRef.current;
    if (prefersReducedMotion()) {
      setPlaying(undefined);
      save(step);
      return;
    }
    const duration = stepDuration(step, columnSizes);
    save(step - 1);
    setPlaying({ key, running: { step, t: 0 } });
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const t = now - start;
      if (t >= duration) {
        frame.current = undefined;
        setPlaying(undefined);
        save(step);
        return;
      }
      setPlaying({ key, running: { step, t } });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [columnSizes, key, stop]);

  const reset = useCallback(() => {
    stop();
    setPlaying(undefined);
    setStepsDoneRef.current(0);
  }, [stop]);

  // Until the effect above drops it, don't draw another conversation's step over this one.
  const running = playing !== undefined && playing.key === key ? playing.running : undefined;
  const scene = useMemo(() => sceneAt(columnSizes, stepsDone, running), [columnSizes, stepsDone, running]);
  return { stepsDone, shownStep: running?.step ?? stepsDone, scene, play, reset };
}
