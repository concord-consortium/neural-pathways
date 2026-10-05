/** One button in a step row. A view lists its buttons, and the row works out their state. */
export interface StepButton {
  /** Unique within the row. */
  key: string;
  label: string;
  /** The run this button plays from `done` steps done, or undefined when it is disabled. */
  run(done: number): { from: number; to: number } | undefined;
  /** Whether it shows as pressed while nothing runs. Trace a Case presses the last step done. */
  showsDone?(done: number): boolean;
}
