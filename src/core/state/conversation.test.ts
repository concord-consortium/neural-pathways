import { validConversationId } from "./conversation";

describe("validConversationId", () => {
  const ids = ["361e65b1002a", "7b117e548ba4", "7ca6475a5371"];

  it("keeps an id that is in the list", () => {
    expect(validConversationId("7b117e548ba4", ids)).toBe("7b117e548ba4");
  });

  it("falls back to the first id when the current one is not in the list", () => {
    expect(validConversationId("000000000000", ids)).toBe("361e65b1002a");
  });

  it("falls back to the first id when there is no current id", () => {
    expect(validConversationId(undefined, ids)).toBe("361e65b1002a");
  });

  it("leaves the id unchanged when the list is empty, since nothing else is valid", () => {
    expect(validConversationId("000000000000", [])).toBe("000000000000");
    expect(validConversationId(undefined, [])).toBeUndefined();
  });
});
