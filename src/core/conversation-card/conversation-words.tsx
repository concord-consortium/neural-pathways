import React from "react";
import { conversationWords } from "../conversation-text";
import "./conversation-words.scss";

/**
 * A conversation's words as one paragraph, as in the prototype. Each word is its own span, so a
 * view can style or point at a single word.
 */
export const ConversationWords: React.FC<{ text: string }> = ({ text }) => (
  <p className="conversation-words">
    {conversationWords(text).map((word, i) => (
      // A word can repeat, so its place is its key.
      <React.Fragment key={i}>
        {i > 0 && " "}
        <span className="conversation-words__word">{word}</span>
      </React.Fragment>
    ))}
  </p>
);
