import React from "react";
import "./message-card.scss";

interface MessageCardProps {
  /** The message's 0-based position in the list being stepped through. */
  position: number;
  /** How many messages the list has. 0 shows the empty state. */
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** The body: the parts in this folder a view chooses. Not shown when total is 0. */
  children?: React.ReactNode;
}

/**
 * The message panel the lesson's views share: which message of how many, previous and
 * next, and a body the view fills from the parts in this folder. With no messages it says
 * nothing matches instead.
 */
export const MessageCard: React.FC<MessageCardProps> = ({
  position, total, onPrev, onNext, children,
}) => {
  const empty = total === 0;
  return (
    <section className="message-card" aria-label="Message">
      {/* Mounted whether or not there are messages: a live region only announces reliably
          once it is in the page. */}
      <span className="message-card__status" role="status">
        {empty ? "" : `Message ${position + 1} of ${total}`}
      </span>
      {empty && <p className="message-card__empty">No messages match that search.</p>}
      {!empty &&
        <div className="message-card__head">
          <h2 className="message-card__title">Message</h2>
          {/* The status says this in words. */}
          <span className="message-card__count" aria-hidden="true">{`${position + 1} / ${total}`}</span>
          <div className="message-card__nav">
            <NavButton label="Previous message" direction="previous" unavailable={position <= 0}
              onClick={onPrev} />
            <NavButton label="Next message" direction="next" unavailable={position >= total - 1}
              onClick={onNext} />
          </div>
        </div>}
      {!empty && <div className="message-card__body">{children}</div>}
    </section>
  );
};

interface NavButtonProps {
  label: string;
  direction: "previous" | "next";
  unavailable: boolean;
  onClick: () => void;
}

/**
 * An unavailable button is aria-disabled rather than disabled, so it keeps its place in the tab
 * order and keeps the focus when stepping reaches an end.
 */
const NavButton: React.FC<NavButtonProps> = ({ label, direction, unavailable, onClick }) => (
  <button type="button" className="message-card__nav-button" aria-label={label}
    aria-disabled={unavailable} onClick={unavailable ? undefined : onClick}>
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d={direction === "previous" ? "M13 4 L6 10 L13 16 Z" : "M7 4 L14 10 L7 16 Z"} />
    </svg>
  </button>
);
