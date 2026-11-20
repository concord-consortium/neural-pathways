import { messageWords } from "./message-text";

const SPECIAL_TOKENS = new Set(["[CLS]", "[SEP]"]);

/**
 * Lines a message's SHAP words up with the words of its text. Returns `[word][pathway]`, one row
 * per message word. The SHAP words carry the model's `[CLS]` and `[SEP]` markers, which aren't
 * part of the message, so they are dropped. Throws when what remains isn't the message's words.
 */
export function alignWordScores(text: string, shapWords: { word: string; scores: number[] }[]): number[][] {
  const scored = shapWords.filter(({ word }) => !SPECIAL_TOKENS.has(word));
  const words = messageWords(text);
  if (scored.length !== words.length) {
    throw new Error(`The word scores have ${scored.length} words but the message has ${words.length}.`);
  }
  return scored.map(({ word, scores }, i) => {
    if (word !== words[i]) {
      throw new Error(`The word scores don't match the message: word ${i + 1} is "${word}" in the scores `
        + `but "${words[i]}" in the message.`);
    }
    return scores;
  });
}
