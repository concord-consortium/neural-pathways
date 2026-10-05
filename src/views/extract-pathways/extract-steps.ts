import { StepButton } from "../../core/steps/step-buttons";
import { StepProgress } from "../../core/steps/step-player";
import { ExtractPathwaysState } from "./extract-pathways-state";

/** The most conversations Collect a Conversation gathers one at a time, as in the prototype. */
export const MAX_COLLECTED = 10;

/**
 * Steps done: 0 for nothing, 1 once Setup is done, and one more for each conversation collected.
 * `limit` is how many can be collected; a saved count above it reads as the limit.
 */
export function extractProgress(state: ExtractPathwaysState, limit: number): StepProgress {
  return {
    get done() {
      return state.setupDone ? 1 + Math.min(state.collected, limit) : 0;
    },
    setDone: (n: number) => state.setProgress(n >= 1, Math.max(0, n - 1)),
  };
}

/**
 * Setup always starts over. Collect a Conversation collects the next one, jumping Setup to its end
 * first if it isn't done, until `limit` are in. The last two steps are not built yet.
 */
export function extractButtons(limit: number): readonly StepButton[] {
  return [
    { key: "setup", label: "Setup", run: () => ({ from: 0, to: 1 }) },
    {
      key: "collect",
      label: "Collect a Conversation",
      run: done => {
        const from = Math.max(done, 1);
        return from - 1 < limit ? { from, to: from + 1 } : undefined;
      },
    },
    { key: "collect-all", label: "Collect All Conversations", run: () => undefined },
    { key: "extract", label: "Extract Pathways", run: () => undefined },
  ];
}
