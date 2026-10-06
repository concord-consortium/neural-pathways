import "./setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validConversationId } from "./conversation";

/** How many hidden codings a student can commission in Investigate Unknown Pathway. */
export const COMMISSION_BUDGET = 2;

/**
 * The state every view reads and writes, carried from one interactive to the next in the Activity
 * Player. Fields arrive with the view stories that first use them; see docs/view-state.md. Adding
 * a field with a default is not a new version.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/SharedState")
export class SharedState extends Model({
  version: tProp(types.literal(1), 1),
  /** The filter query every view uses. Unset: no query has been set. "": the student cleared it. */
  query: tProp(types.maybe(types.string)),
  /** The current conversation, in every view that shows one. Unset until a view first loads them. */
  conversationId: tProp(types.maybe(types.string)),
  /** Attribute keys commissioned in Investigate Unknown Pathway, in the order they were commissioned. */
  commissioned: tProp(types.array(types.string), () => []),
}) {
  @modelAction
  setQuery(query: string | undefined) {
    this.query = query;
  }

  @modelAction
  setConversationId(conversationId: string | undefined) {
    this.conversationId = conversationId;
  }

  /**
   * Called by a view that shows a conversation when its list of conversations arrives or changes,
   * so the next view opens on the same case.
   */
  @modelAction
  ensureValidConversation(ids: readonly string[]) {
    const id = validConversationId(this.conversationId, ids);
    if (id !== this.conversationId) {
      this.conversationId = id;
    }
  }

  /** Adds a coding, unless it is already commissioned or the budget is spent. */
  @modelAction
  commission(attributeKey: string) {
    if (this.commissioned.includes(attributeKey) || this.commissioned.length >= COMMISSION_BUDGET) {
      return;
    }
    this.commissioned.push(attributeKey);
  }

  @modelAction
  resetCommissioned() {
    this.commissioned = [];
  }
}
