import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Scene } from "../../core/network-diagram/scene";
import { TraceACaseState } from "./trace-a-case-state";
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

interface Playing {
  /** The conversation the step is playing for. */
  conversationId: string | undefined;
  running: RunningStep;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Plays Trace a Case's steps for the current conversation on a requestAnimationFrame clock, and
 * keeps the steps done for each conversation in `state`. A step saves the step before when it
 * starts and itself when it ends, so a step still playing is never saved. Changing conversation,
 * or unmounting, drops a step that is playing. With no conversation, nothing is done or saved.
 *
 * It reads `state`, so call it inside an `observer` component. `columnSizes` must be a stable
 * array.
 */
export function useStepPlayer(
  columnSizes: readonly number[], state: TraceACaseState, conversationId: string | undefined,
): StepPlayer {
  const stepsDone = conversationId === undefined ? 0 : state.stepsDone(conversationId);
  const [playing, setPlaying] = useState<Playing | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);

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
  }, [conversationId, stop]);

  const save = useCallback((steps: number) => {
    if (conversationId !== undefined) {
      state.setStepsDone(conversationId, steps);
    }
  }, [conversationId, state]);

  const play = useCallback((step: Step) => {
    stop();
    if (prefersReducedMotion()) {
      setPlaying(undefined);
      save(step);
      return;
    }
    const duration = stepDuration(step, columnSizes);
    save(step - 1);
    setPlaying({ conversationId, running: { step, t: 0 } });
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
      setPlaying({ conversationId, running: { step, t } });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [columnSizes, conversationId, save, stop]);

  const reset = useCallback(() => {
    stop();
    setPlaying(undefined);
    save(0);
  }, [save, stop]);

  // Until the effect above drops it, don't draw another conversation's step over this one.
  const running = playing !== undefined && playing.conversationId === conversationId ? playing.running : undefined;
  const scene = useMemo(() => sceneAt(columnSizes, stepsDone, running), [columnSizes, stepsDone, running]);
  return { stepsDone, shownStep: running?.step ?? stepsDone, scene, play, reset };
}
