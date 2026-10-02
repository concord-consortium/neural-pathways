import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validConversationId } from "./conversation";

/** How many hidden codings a student can commission in Investigate Unknown Pathway. */
export const COMMISSION_BUDGET = 2;

/**
 * The state every view reads and writes, carried from one interactive to the next in the Activity
 * Player.
 *
 * The `$modelType` is stored in saved student data: never rename it. See docs/view-state.md.
 */
@model("npw/SharedState")
export class SharedState extends Model({
  version: tProp(types.literal(1), 1),
  /** Unset: no query has been set. "": the student cleared it. */
  query: tProp(types.maybe(types.string)),
  conversationId: tProp(types.maybe(types.string)),
  /** Attribute keys, in the order they were commissioned. */
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
   * Called by a view that shows a conversation, when it first renders and whenever its filtered
   * list changes, so the next view opens on the same case.
   */
  @modelAction
  ensureValidConversation(filteredIds: readonly string[]) {
    const id = validConversationId(this.conversationId, filteredIds);
    if (id !== this.conversationId) {
      this.conversationId = id;
    }
  }

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
