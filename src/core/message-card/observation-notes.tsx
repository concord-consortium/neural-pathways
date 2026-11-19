import React, { useId } from "react";
import { useKeyboardScrollable } from "../use-keyboard-scrollable";
import "./observation-notes.scss";

interface ObservationNotesProps {
  observation?: string;
  /** Whether the notes are shown. The view keeps it, so it survives moving between messages. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * What the observer wrote about the message, under a heading that opens and closes it. A view
 * starts it closed, as the prototype does: the notes are the evidence behind the message, there
 * for a student who asks for them.
 */
export const ObservationNotes: React.FC<ObservationNotesProps> = ({ observation, open, onOpenChange }) => {
  const toggleId = useId();
  const boxId = useId();
  const [boxRef, boxProps] = useKeyboardScrollable<HTMLDivElement>();
  return (
    <div className="observation-notes">
      {/* The button goes inside the heading, so the heading stays in the outline. */}
      <h3 className="observation-notes__head">
        <button type="button" id={toggleId} className="observation-notes__toggle" aria-expanded={open}
          aria-controls={boxId} onClick={() => onOpenChange(!open)}>
          <span className="observation-notes__caret" aria-hidden="true" />
          Observation notes
        </button>
      </h3>
      {/* The box scrolls when the card is too short for it, and the keyboard can reach it then. It is
          a region named by the heading whether it scrolls or not. */}
      <div ref={boxRef} id={boxId} className="observation-notes__box" role="region" aria-labelledby={toggleId}
        hidden={!open} {...boxProps}>
        <p className="observation-notes__text">{observation || "(no notes for this message)"}</p>
      </div>
    </div>
  );
};
