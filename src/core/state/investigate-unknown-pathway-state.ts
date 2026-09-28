import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validConversationId } from "./conversation";

export type Pane = 1 | 2;

/**
 * Investigate Unknown Pathway's own state. Pane 1 shows SharedState's conversation; pane 2 keeps
 * its own, so the two panes can compare cases. The query and the commissioned codings are in
 * SharedState. The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/InvestigateUnknownPathwayState")
export class InvestigateUnknownPathwayState extends Model({
  version: tProp(types.literal(1), 1),
  pane1: tProp(
    types.object(() => ({ selectedAttributes: types.array(types.string) })),
    () => ({ selectedAttributes: [] })
  ),
  pane2: tProp(
    types.object(() => ({
      conversationId: types.maybe(types.string),
      selectedAttributes: types.array(types.string),
    })),
    () => ({ selectedAttributes: [] })
  ),
}) {
  @modelAction
  toggleAttribute(pane: Pane, attributeKey: string) {
    const selected = (pane === 1 ? this.pane1 : this.pane2).selectedAttributes;
    const at = selected.indexOf(attributeKey);
    if (at >= 0) {
      selected.splice(at, 1);
    } else {
      selected.push(attributeKey);
    }
  }

  @modelAction
  setPane2ConversationId(conversationId: string | undefined) {
    this.pane2.conversationId = conversationId;
  }

  /**
   * Like SharedState.ensureValidConversation, but falls back to the second conversation so the
   * panes open on different cases, as in the prototype. It changes state without a student action:
   * wrap it in `withoutUndo` once undo exists.
   */
  @modelAction
  ensureValidPane2Conversation(filteredIds: readonly string[]) {
    const id = validConversationId(this.pane2.conversationId, filteredIds, 1);
    if (id !== this.pane2.conversationId) {
      this.pane2.conversationId = id;
    }
  }
}
