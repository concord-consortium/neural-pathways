import { validConversationId } from "./conversation";

describe("validConversationId", () => {
  const ids = ["3fa91c2e", "a07b5d10", "e41c9f22"];

  it("keeps an id that is in the filtered list", () => {
    expect(validConversationId("a07b5d10", ids)).toBe("a07b5d10");
  });

  it("falls back to the first id when the current one is not in the list", () => {
    expect(validConversationId("00000000", ids)).toBe("3fa91c2e");
  });

  it("falls back to the first id when there is no current id", () => {
    expect(validConversationId(undefined, ids)).toBe("3fa91c2e");
  });

  it("leaves the id unchanged when the list is empty, since nothing else is valid", () => {
    expect(validConversationId("00000000", [])).toBe("00000000");
    expect(validConversationId(undefined, [])).toBeUndefined();
  });

  it("falls back to the id at the fallback index", () => {
    expect(validConversationId(undefined, ids, 1)).toBe("a07b5d10");
  });

  it("falls back to the last id when the fallback index is past the end", () => {
    expect(validConversationId(undefined, ["3fa91c2e"], 1)).toBe("3fa91c2e");
  });
});
