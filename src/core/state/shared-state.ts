import "./setup";
import { action, observable } from "mobx";
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
  /** The filter query every view uses. Unset: no query has been set. "": the student cleared it. */
  query: tProp(types.maybe(types.string)),
  /** The current conversation, in every view that shows one. Unset until a view first loads its conversations. */
  conversationId: tProp(types.maybe(types.string)),
}) {
  /**
   * The filter bar's text while it differs from `query`; unset otherwise. Volatile: it is never
   * saved and never an undo step. It lets a half-typed query survive switching views, but not a
   * reload.
   */
  @observable accessor queryDraft: string | undefined = undefined;

  @action
  setQueryDraft(text: string) {
    this.queryDraft = text === (this.query ?? "") ? undefined : text;
  }

  @action
  discardQueryDraft() {
    this.queryDraft = undefined;
  }

  /**
   * Stores a query the student has finished typing, and corrects the conversation against its
   * matches. One action, so one undo can reverse both; see docs/undo.md.
   */
  @modelAction
  setQueryAndCorrect(query: string, ids: readonly string[]) {
    this.query = query;
    this.queryDraft = undefined;
    this.ensureValidConversation(ids);
  }

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
