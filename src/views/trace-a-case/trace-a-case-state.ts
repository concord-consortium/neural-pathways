import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** A marker on Trace a Case's timeline: how many of the pass's four steps are done, none to all. */
const markerType = types.refinement(types.integer, n => n >= 0 && n <= 4, "marker, 0 to 4");

/**
 * Trace a Case's own state. The current conversation is in SharedState. Animate and speed arrive
 * with their controls; see docs/view-state.md. Adding a field with a default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/TraceACaseState")
export class TraceACaseState extends Model({
  version: tProp(types.literal(1), 1),
  /**
   * The marker each conversation rests at, by conversation id. A step still playing isn't counted,
   * and a conversation at the start isn't stored.
   */
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
