import "./setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validConversationId } from "./conversation";

/**
 * The state every view reads and writes, carried from one interactive to the next in the Activity
 * Player. Fields arrive with the view stories that first use them; see docs/view-state.md for them
 * and for the rules on changing the saved form.
 *
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/SharedState")
export class SharedState extends Model({
  version: tProp(types.literal(1), 1),
  /** The current conversation, in every view that shows one. Unset until a view first loads its conversations. */
  conversationId: tProp(types.maybe(types.string)),
}) {
  @modelAction
  setConversationId(conversationId: string | undefined) {
    this.conversationId = conversationId;
  }

  /**
   * Called by a view that shows a conversation when its list of conversations arrives or changes,
   * so the next view opens on the same conversation.
   */
  @modelAction
  ensureValidConversation(ids: readonly string[]) {
    const id = validConversationId(this.conversationId, ids);
    if (id !== this.conversationId) {
      this.conversationId = id;
    }
  }
}
