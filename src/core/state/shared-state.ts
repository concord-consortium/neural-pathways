import "./setup";
import { action, observable } from "mobx";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validMessageId } from "./message";

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
  /** The current message, in every view that shows one. Unset until a view first loads its messages. */
  messageId: tProp(types.maybe(types.string)),
}) {
  /**
   * The filter bar's text while it differs from `query`; unset otherwise. Filtering follows it as
   * the student types, but only `setQueryAndCorrect` stores a query and corrects the message. It is
   * kept here, not in the filter bar, so every view's filter bar shows the same text and a
   * half-typed query survives switching views. It is volatile (`@observable accessor`, not a
   * `tProp`): never saved, never in a snapshot and never an undo step.
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
   * Stores a query the student has finished typing, and corrects the message against its
   * matches. One action, so one undo can reverse both; see docs/undo.md.
   */
  @modelAction
  setQueryAndCorrect(query: string, ids: readonly string[]) {
    this.query = query;
    this.queryDraft = undefined;
    this.ensureValidMessage(ids);
  }

  @modelAction
  setMessageId(messageId: string | undefined) {
    this.messageId = messageId;
  }

  /**
   * Called by a view that shows a message when its list of messages arrives or changes,
   * so the next view opens on the same message.
   */
  @modelAction
  ensureValidMessage(ids: readonly string[]) {
    const id = validMessageId(this.messageId, ids);
    if (id !== this.messageId) {
      this.messageId = id;
    }
  }
}
