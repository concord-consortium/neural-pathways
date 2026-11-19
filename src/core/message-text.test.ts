import { messageWords } from "./message-text";

describe("messageWords", () => {
  it("splits the turns into one list of words, dropping the line breaks", () => {
    expect(messageWords("yandor quissa\nblikka murrash\naloven")).toEqual(
      ["yandor", "quissa", "blikka", "murrash", "aloven"]);
  });

  it("treats any run of whitespace as one break", () => {
    expect(messageWords("arvek  karnok\t\n\nmellu")).toEqual(["arvek", "karnok", "mellu"]);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(messageWords("\n chullo yandor \n")).toEqual(["chullo", "yandor"]);
  });

  it("has no words for empty or blank text", () => {
    expect(messageWords("")).toEqual([]);
    expect(messageWords(" \n ")).toEqual([]);
  });
});
