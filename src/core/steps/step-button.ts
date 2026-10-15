import { Marker, Segment } from "./step-player";

/** One step button. A view lists them, and `StepButtonGroup` works out their state. */
export interface StepButton {
  /** Unique within the row. */
  key: string;
  label: string;
  /**
   * The segment this button plays when the timeline rests at `marker`, or undefined if it should be
   * unavailable at this marker.
   */
  segmentToPlayWhenAt(marker: Marker): Segment | undefined;
  /** Whether it is marked as the current step while nothing plays. */
  showAsCurrentWhenAt?(marker: Marker): boolean;
}
