import React from "react";
import { messageWords } from "../message-text";
import "./message-words.scss";

/**
 * A message's words as one paragraph, as in the prototype. Each word is its own span, so a
 * view can style or point at a single word.
 */
export const MessageWords: React.FC<{ text: string }> = ({ text }) => (
  <p className="message-words">
    {messageWords(text).map((word, i) => (
      // A word can repeat, so its place is its key.
      <React.Fragment key={i}>
        {i > 0 && " "}
        <span className="message-words__word">{word}</span>
      </React.Fragment>
    ))}
  </p>
);
