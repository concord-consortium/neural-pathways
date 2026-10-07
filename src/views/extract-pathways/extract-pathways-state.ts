import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** A count that can't go below zero. */
const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");

/**
 * Extract Pathways' own state: the extraction stages completed so far. A stage in progress is not
 * kept. See docs/view-state.md for the fields still to come and the rules on changing the saved
 * form.
 */
@model("npw/ExtractPathwaysState")
export class ExtractPathwaysState extends Model({
  version: tProp(types.literal(1), 1),
  /** Whether Setup is done: the hidden neurons are lifted out of the network. */
  setupDone: tProp(types.boolean, false),
  /** How many conversations have been collected into the deck. */
  collected: tProp(countType, 0),
}) {
  /**
   * One action, so a step that changes both is one change. The count is set first: it is the one
   * that can be refused, and a refused count must leave Setup as it was.
   */
  @modelAction
  setProgress(setupDone: boolean, collected: number) {
    this.collected = collected;
    this.setupDone = setupDone;
  }
}
