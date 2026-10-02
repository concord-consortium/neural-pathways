/**
 * The conversation a view should show from its filtered list: `currentId` when the list has it,
 * otherwise the first id. An empty list leaves `currentId` unchanged: there is nothing valid to
 * switch to, and when the student loosens the query their conversation comes back.
 */
export function validConversationId(currentId: string | undefined, filteredIds: readonly string[]): string | undefined {
  if (filteredIds.length === 0) {
    return currentId;
  }
  if (currentId !== undefined && filteredIds.includes(currentId)) {
    return currentId;
  }
  return filteredIds[0];
}
