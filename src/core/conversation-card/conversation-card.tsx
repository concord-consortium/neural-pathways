import React from "react";
import { conversationWords } from "../conversation-text";
import { S3Item } from "../types/s3-data";
import "./conversation-card.scss";

interface ConversationCardProps {
  conversation: S3Item;
  /** The conversation's 0-based position in the list being stepped through. */
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * The conversation panel, minimal version: which conversation of how many, previous and next, and
 * its words. The full card, with the label chip, observation notes and attribute icons, will build
 * on this.
 */
export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation, position, total, onPrev, onNext,
}) => {
  // One paragraph, as in the prototype: the line breaks between turns are dropped.
  const words = conversationWords(conversation.text).join(" ");
  return (
    <section className="conversation-card" aria-label="Conversation">
      <div className="conversation-card__head">
        <h2 className="conversation-card__title">Conversation</h2>
        <span className="conversation-card__count">{`${position + 1} / ${total}`}</span>
        <div className="conversation-card__nav">
          <NavButton label="Previous conversation" direction="previous" disabled={position <= 0} onClick={onPrev} />
          <NavButton label="Next conversation" direction="next" disabled={position >= total - 1} onClick={onNext} />
        </div>
      </div>
      <p className="conversation-card__text">{words}</p>
    </section>
  );
};

interface NavButtonProps {
  label: string;
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}

/** aria-disabled rather than disabled, so the button keeps its place in the tab order. */
const NavButton: React.FC<NavButtonProps> = ({ label, direction, disabled, onClick }) => (
  <button type="button" className="conversation-card__nav-button" aria-label={label} aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}>
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d={direction === "previous" ? "M13 4 L6 10 L13 16 Z" : "M7 4 L14 10 L7 16 Z"} />
    </svg>
  </button>
);
