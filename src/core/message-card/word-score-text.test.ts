import { noteName, pathwayName, signedScore, spokenScore, wordScoreNote } from "./word-score-text";

describe("word score text", () => {
  it("names pathways from 1", () => {
    expect(pathwayName(0)).toBe("Pathway 1");
    expect(pathwayName(2)).toBe("Pathway 3");
  });

  it("shows scores with a sign, four decimals and a true minus", () => {
    expect(signedScore(0.0624)).toBe("+0.0624");
    expect(signedScore(-0.06244)).toBe("−0.0624");
  });

  it("speaks scores as plus or minus", () => {
    expect(spokenScore(0.0624)).toBe("plus 0.0624");
    expect(spokenScore(-0.0624)).toBe("minus 0.0624");
  });

  describe("wordScoreNote", () => {
    it("gives the score when the word scores in the pathway", () => {
      expect(wordScoreNote("tarrak", [0.0624, 0, 0], 0)).toEqual({ kind: "score", word: "tarrak", value: 0.0624 });
    });

    it("points to the pathway where the word scores when it is zero in this one", () => {
      expect(wordScoreNote("tarrak", [0.0624, 0, 0], 1)).toEqual({ kind: "elsewhere", word: "tarrak", pathway: 0 });
    });

    it("names the first pathway where a word that scores on two is not zero", () => {
      expect(wordScoreNote("oradda", [0, 0.1, -0.2], 0)).toEqual({ kind: "elsewhere", word: "oradda", pathway: 1 });
      expect(wordScoreNote("oradda", [0, 0.1, -0.2], 2)).toEqual({ kind: "score", word: "oradda", value: -0.2 });
    });

    it("gives nothing when every score is zero", () => {
      expect(wordScoreNote("blikka", [0, 0, 0], 0)).toBeUndefined();
    });
  });

  it("names a note for a screen reader", () => {
    expect(noteName({ kind: "score", word: "tarrak", value: 0.0624 })).toBe("tarrak, plus 0.0624");
    expect(noteName({ kind: "elsewhere", word: "tarrak", pathway: 0 })).toBe("tarrak, a Pathway 1 word");
  });
});
