import "../../core/state/setup";
import { composeMixins, ExtendedModel, model, modelAction, tProp, types } from "mobx-keystone";
import { animatedMixin } from "../../core/state/animation";

/** A count that can't go below zero. */
const countType = types.refinement(types.integer, n => n >= 0, "non-negative integer");

/** Every stage of the extraction, stored together. */
export interface ExtractProgress {
  setupDone: boolean;
  collected: number;
  deckDone: boolean;
  pathwaysDone: boolean;
}

/**
 * Extract Pathways' own state. A stage still playing isn't stored. See docs/view-state.md for the
 * fields still to come and the rules on changing the saved form.
 */
@model("npw/ExtractPathwaysState")
export class ExtractPathwaysState extends ExtendedModel(composeMixins(animatedMixin), {
  version: tProp(types.literal(1), 1),
  /** Whether Setup is done: the hidden neurons are lifted out of the network. */
  setupDone: tProp(types.boolean, false),
  /** How many conversations have been collected into the deck. */
  collected: tProp(countType, 0),
  /** Whether Collect All Conversations is done: the deck holds every conversation. */
  deckDone: tProp(types.boolean, false),
  /** Whether Extract Pathways is done: the three pathways are drawn from the deck. */
  pathwaysDone: tProp(types.boolean, false),
}) {
  /**
   * One action, so storing every stage is one change. The count is set first: it is the one that
   * can be refused, and a refused count must leave every stage as it was.
   */
  @modelAction
  setProgress({ setupDone, collected, deckDone, pathwaysDone }: ExtractProgress) {
    this.collected = collected;
    this.setupDone = setupDone;
    this.deckDone = deckDone;
    this.pathwaysDone = pathwaysDone;
  }
}
