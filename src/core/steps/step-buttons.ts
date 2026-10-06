import { Marker, Segment } from "./step-player";

/** One button in a step row. A view lists its buttons, and the row works out their state. */
export interface StepButton {
  /** Unique within the row. */
  key: string;
  label: string;
  /**
   * The segment this button plays when the timeline rests at `marker`, or undefined if it should be
   * disabled at this marker.
   */
  segmentToPlayWhenAt(marker: Marker): Segment | undefined;
  /** Whether it shows as pressed while nothing plays. Trace a Case presses the step it rests at. */
  showAsPressedWhenAt?(marker: Marker): boolean;
}
