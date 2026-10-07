import { useMemo } from "react";
import { useSharedState } from "../state/view-state-context";
import { ConversationFilter } from "./conversation-filter";
import { FilterBarProps } from "./filter-bar";

export interface ConversationFilterView {
  /** The conversations the view steps through, in dataset order. */
  ids: readonly string[];
  /** The props for the view's FilterBar. */
  bar: FilterBarProps;
}

/**
 * The view's side of the filter. The list follows the draft while the student types, if it can be
 * read; otherwise the stored query. Only a commit, on Enter or blur, stores a query and corrects
 * the shared conversation. Call it from an observer component.
 */
export function useConversationFilter(filter: ConversationFilter): ConversationFilterView {
  const shared = useSharedState();
  const query = shared.query ?? "";
  const draft = shared.queryDraft;
  const stored = useMemo(() => filter.run(query), [filter, query]);
  const drafted = useMemo(() => (draft === undefined ? undefined : filter.run(draft)), [filter, draft]);

  // The count, or the error, describes the result the list comes from, except that an unreadable
  // draft's error is shown over the stored query's list.
  const shown = drafted && "ids" in drafted ? drafted : stored;
  const ids = "ids" in shown ? shown.ids : filter.allIds;
  const error = drafted && "error" in drafted ? drafted.error : "error" in shown ? shown.error : undefined;

  return {
    ids,
    bar: {
      text: draft ?? query,
      status: error === undefined ? { matched: ids.length, total: filter.allIds.length } : { error },
      fields: filter.fields,
      attributes: filter.attributes,
      onTextChange: text => shared.setQueryDraft(text),
      onCommit: () => {
        // Read at the moment of the commit, not from this render.
        const current = shared.queryDraft;
        if (current === undefined) {
          return;
        }
        const result = filter.run(current);
        if ("ids" in result) {
          shared.setQueryAndCorrect(current, result.ids);
        }
      },
      onDiscard: () => shared.discardQueryDraft(),
    },
  };
}
