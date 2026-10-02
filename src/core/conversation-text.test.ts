import { conversationWords } from "./conversation-text";

describe("conversationWords", () => {
  it("splits the turns into one list of words, dropping the line breaks", () => {
    expect(conversationWords("yandor quissa\nblikka murrash\naloven")).toEqual(
      ["yandor", "quissa", "blikka", "murrash", "aloven"]);
  });

  it("treats any run of whitespace as one break", () => {
    expect(conversationWords("arvek  karnok\t\n\nmellu")).toEqual(["arvek", "karnok", "mellu"]);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(conversationWords("\n chullo yandor \n")).toEqual(["chullo", "yandor"]);
  });

  it("has no words for empty or blank text", () => {
    expect(conversationWords("")).toEqual([]);
    expect(conversationWords(" \n ")).toEqual([]);
  });
});
