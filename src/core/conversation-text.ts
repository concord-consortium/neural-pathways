/**
 * A conversation's words, in order. The text puts each turn on its own line; the lesson treats it
 * as one run of words, so the line breaks, and any other whitespace, only separate words.
 */
export function conversationWords(text: string): string[] {
  return text.split(/\s+/).filter(word => word !== "");
}
