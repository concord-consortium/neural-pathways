import "../../core/state/setup";
import { composeMixins, ExtendedModel, model, modelAction, tProp, types } from "mobx-keystone";
import { animatedMixin } from "../../core/state/animation";

/** A marker on Trace a Case's timeline: how many of Steps 1–4 are done, 0 to 4. */
const markerType = types.refinement(types.integer, n => n >= 0 && n <= 4, "marker, 0 to 4");

/**
 * Trace a Case's own state. The current message is in SharedState. See docs/view-state.md for
 * the fields still to come and the rules on changing the saved form.
 */
@model("npw/TraceACaseState")
export class TraceACaseState extends ExtendedModel(composeMixins(animatedMixin), {
  version: tProp(types.literal(1), 1),
  /**
   * The marker each message rests at, by message id. A message at the start isn't
   * stored.
   */
  markerByMessage: tProp(types.record(markerType), () => ({})),
}) {
  marker(messageId: string): number {
    return this.markerByMessage[messageId] ?? 0;
  }

  @modelAction
  setMarker(messageId: string, marker: number) {
    if (marker === 0) {
      delete this.markerByMessage[messageId];
    } else {
      this.markerByMessage[messageId] = marker;
    }
  }
}
