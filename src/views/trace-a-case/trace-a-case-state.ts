import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** A marker on Trace a Case's timeline: how many of the pass's four steps are done, none to all. */
const markerType = types.refinement(types.integer, n => n >= 0 && n <= 4, "marker, 0 to 4");

/**
 * Trace a Case's own state. The current conversation is in SharedState. See docs/view-state.md for
 * the fields still to come and the rules on changing the saved form.
 */
@model("npw/TraceACaseState")
export class TraceACaseState extends Model({
  version: tProp(types.literal(1), 1),
  /** The marker each conversation rests at, by conversation id. A conversation at the start isn't stored. */
  markerByConversation: tProp(types.record(markerType), () => ({})),
}) {
  marker(conversationId: string): number {
    return this.markerByConversation[conversationId] ?? 0;
  }

  @modelAction
  setMarker(conversationId: string, marker: number) {
    if (marker === 0) {
      delete this.markerByConversation[conversationId];
    } else {
      this.markerByConversation[conversationId] = marker;
    }
  }
}
