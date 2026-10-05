import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** A count that can't go below zero. */
const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");

/**
 * Extract Pathways' own state: the extraction stages completed so far. A stage in progress is not
 * kept. Animate, speed and the later stages add their fields as they are built; see
 * docs/view-state.md. Adding a field with a default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/ExtractPathwaysState")
export class ExtractPathwaysState extends Model({
  version: tProp(types.literal(1), 1),
  /** Whether Setup is done: the hidden neurons are lifted out of the network. */
  setupDone: tProp(types.boolean, false),
  /** How many conversations have been collected into the deck. */
  collected: tProp(countType, 0),
}) {
  /** One action, so a step that changes both is one change. */
  @modelAction
  setProgress(setupDone: boolean, collected: number) {
    this.setupDone = setupDone;
    this.collected = collected;
  }
}
