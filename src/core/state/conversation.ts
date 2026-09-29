/**
 * The conversation a view should show from its list: `currentId` when the list has it, otherwise
 * the first id. An empty list leaves `currentId` unchanged: there is nothing valid to switch to,
 * and when the student loosens the query their conversation comes back.
 */
export function validConversationId(
  currentId: string | undefined,
  ids: readonly string[]
): string | undefined {
  if (ids.length === 0) {
    return currentId;
  }
  if (currentId !== undefined && ids.includes(currentId)) {
    return currentId;
  }
  return ids[0];
}
