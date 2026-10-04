import "../../core/state/setup";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { validConversationId } from "../../core/state/conversation";

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
   * Like SharedState.ensureValidConversation, but when pane 2's conversation isn't in the list it
   * falls back to the first one that pane 1 isn't showing, so the panes open on different cases.
   * Pass SharedState's `conversationId`.
   */
  @modelAction
  ensureValidPane2Conversation(filteredIds: readonly string[], pane1ConversationId: string | undefined) {
    const current = this.pane2.conversationId;
    if (filteredIds.length === 0 || (current !== undefined && filteredIds.includes(current))) {
      return;
    }
    // Pane 1 falls back the way SharedState does, so avoid the case it shows or is about to show.
    const pane1Id = validConversationId(pane1ConversationId, filteredIds);
    this.pane2.conversationId = filteredIds.find(id => id !== pane1Id) ?? filteredIds[0];
  }
}
