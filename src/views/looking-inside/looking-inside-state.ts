import "../../core/state/setup";
import { action, observable } from "mobx";
import { composeMixins, ExtendedModel, model, modelAction, tProp, types } from "mobx-keystone";
import { animatedMixin } from "../../core/state/animation";

/** A marker on Looking Inside a Neural Network's timeline: how many of Steps 1–4 are done, 0 to 4. */
const markerType = types.refinement(types.integer, n => n >= 0 && n <= 4, "marker, 0 to 4");

/**
 * Looking Inside a Neural Network's own state. The current message is in SharedState. See
 * docs/view-state.md for the fields still to come and the rules on changing the saved form.
 */
@model("npw/LookingInsideState")
export class LookingInsideState extends ExtendedModel(composeMixins(animatedMixin), {
  version: tProp(types.literal(1), 1),
  /**
   * The marker each message rests at, by message id. A message at the start isn't
   * stored.
   */
  markerByMessage: tProp(types.record(markerType), () => ({})),
}) {
  /**
   * Whether the observation notes are open. It is volatile (`@observable accessor`, not a `tProp`):
   * it lasts for the life of the page, so the notes stay open across messages and views, but it is
   * never saved, never in a snapshot and never an undo step. A reload closes the notes, as in the
   * prototype.
   */
  @observable accessor notesOpen = false;

  @action
  setNotesOpen(open: boolean) {
    this.notesOpen = open;
  }

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
