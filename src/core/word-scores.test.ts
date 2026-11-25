import { alignWordScores } from "./word-scores";

const shap = (words: string[]) => words.map((word, i) => ({ word, scores: [i, 0, -i] }));

describe("alignWordScores", () => {
  it("drops [CLS] and [SEP] and keeps the rest in order", () => {
    expect(alignWordScores("aa bb\ncc", shap(["[CLS]", "aa", "bb", "[SEP]", "cc", "[SEP]"])))
      .toEqual([[1, 0, -1], [2, 0, -2], [4, 0, -4]]);
  });

  it("is an error when a word differs", () => {
    expect(() => alignWordScores("aa bb", shap(["[CLS]", "aa", "zz", "[SEP]"])))
      .toThrow('The word scores don\'t match the message: word 2 is "zz" in the scores but "bb" in the message.');
  });

  it("is an error when the counts differ", () => {
    expect(() => alignWordScores("aa bb", shap(["[CLS]", "aa", "[SEP]"])))
      .toThrow("The word scores have 1 words but the message has 2.");
  });
});
