const MINUS = "−";

/** A pathway's name on screen: pathways are 0-based in code and numbered from 1 for students. */
export const pathwayName = (pathway: number): string => `Pathway ${pathway + 1}`;

/** A score as shown, with its sign, four decimals and a true minus sign: "+0.0624". */
export const signedScore = (value: number): string =>
  `${value < 0 ? MINUS : "+"}${Math.abs(value).toFixed(4)}`;

/** A score as a screen reader should say it: "plus 0.0624". */
export const spokenScore = (value: number): string =>
  `${value < 0 ? "minus" : "plus"} ${Math.abs(value).toFixed(4)}`;

export type WordScoreNote =
  | { kind: "score"; word: string; value: number }
  | { kind: "elsewhere"; word: string; pathway: number };

/**
 * What to say about a word in a pathway: its score there, or, when it is 0 there, the first pathway
 * where it isn't. Undefined when the word scores 0 in every pathway.
 */
export const wordScoreNote = (word: string, scores: number[], pathway: number): WordScoreNote | undefined => {
  const value = scores[pathway];
  if (value) return { kind: "score", word, value };
  const other = scores.findIndex(score => score !== 0);
  return other === -1 ? undefined : { kind: "elsewhere", word, pathway: other };
};

/** A note's accessible name: "tarrak, plus 0.0624" or "tarrak, a Pathway 1 word". */
export const noteName = (note: WordScoreNote): string =>
  note.kind === "score"
    ? `${note.word}, ${spokenScore(note.value)}`
    : `${note.word}, a ${pathwayName(note.pathway)} word`;
