import React from "react";
import "./conversation-card.scss";

interface ConversationCardProps {
  /** The conversation's 0-based position in the list being stepped through. */
  position: number;
  /** How many conversations the list has. 0 shows the empty state. */
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** The body: the parts in this folder a view chooses. Not shown when total is 0. */
  children?: React.ReactNode;
}

/**
 * The conversation panel every view shares: which conversation of how many, previous and next,
 * and a body the view fills from the parts in this folder. With no conversations it says nothing
 * matches instead.
 */
export const ConversationCard: React.FC<ConversationCardProps> = ({
  position, total, onPrev, onNext, children,
}) => {
  const empty = total === 0;
  return (
    <section className="conversation-card" aria-label="Conversation">
      {/* Mounted whether or not there are conversations: a live region only announces reliably
          once it is in the page. */}
      <span className="conversation-card__status" role="status">
        {empty ? "" : `Conversation ${position + 1} of ${total}`}
      </span>
      {empty && <p className="conversation-card__empty">No conversations match that search.</p>}
      {!empty &&
        <div className="conversation-card__head">
          <h2 className="conversation-card__title">Conversation</h2>
          {/* The status says this in words. */}
          <span className="conversation-card__count" aria-hidden="true">{`${position + 1} / ${total}`}</span>
          <div className="conversation-card__nav">
            <NavButton label="Previous conversation" direction="previous" disabled={position <= 0}
              onClick={onPrev} />
            <NavButton label="Next conversation" direction="next" disabled={position >= total - 1}
              onClick={onNext} />
          </div>
        </div>}
      {!empty && <div className="conversation-card__body">{children}</div>}
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
