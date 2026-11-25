import React, { useId, useRef } from "react";
import { wordFill } from "../colors";
import { noteName, pathwayName, wordScoreNote } from "./word-score-text";
import { useWordTooltipEvents } from "./word-tooltip";
// The messages' face (see message-words.tsx).
import "@fontsource/spline-sans-mono/400.css";
import "./pathway-reading.scss";

interface PathwayReadingProps {
  /** 0-based; shown and named as pathwayName(pathway). */
  pathway: number;
  /** messageWords(text). */
  words: string[];
  /** [word][pathway], from useWordScores. Undefined while loading: plain words, no listbox. */
  scores: number[][] | undefined;
  /** The scale maximum. */
  max: number;
  /** The current word's position, shared by the caller's readings. */
  current: number | undefined;
  onCurrentChange: (index: number) => void;
}

/** The position a key moves the current word to, or undefined for a key the reading doesn't use. */
function keyTarget(key: string, index: number, count: number): number | undefined {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(index + 1, count - 1);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(index - 1, 0);
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}

/**
 * One pathway's reading of a message: its Pathway row, then the words, each colored by its score on
 * this pathway. The words are a single-choice listbox named by the pathway, with a roving tabindex:
 * only the current word is in the tab order, and focusing a word makes it current. The caller holds
 * the current word, so several readings can share it.
 */
export const PathwayReading: React.FC<PathwayReadingProps> = ({
  pathway, words, scores, max, current, onCurrentChange,
}) => {
  const rowId = useId();
  const events = useWordTooltipEvents();
  // The options by position, since a word can repeat.
  const optionRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // The current word, or the first when there is none or it is past the end, so the reading always
  // has a Tab stop.
  const tabStop = current !== undefined && current < words.length ? current : 0;

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    // With a modifier, these keys are the browser's (Alt+← and Cmd+← go back), so leave them be.
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = keyTarget(event.key, index, words.length);
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    optionRefs.current[target]?.focus();
  };

  if (!scores) {
    return (
      <div className="pathway-reading">
        <div className="pathway-reading__pathway">{pathwayName(pathway)}</div>
        <p className="pathway-reading__words">
          {words.map((word, i) => (
            <React.Fragment key={i}>
              {i > 0 && " "}
              <span className="pathway-reading__word">{word}</span>
            </React.Fragment>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div className="pathway-reading">
      <div id={rowId} className="pathway-reading__pathway">{pathwayName(pathway)}</div>
      <div role="listbox" aria-labelledby={rowId} className="pathway-reading__words">
        {words.map((word, i) => {
          const note = wordScoreNote(word, scores[i], pathway);
          const value = scores[i][pathway];
          const fill = value ? wordFill(value, max) : undefined;
          const target = (element: HTMLElement) => ({ element, note });
          return (
            // A word can repeat, so its place is its key.
            <React.Fragment key={i}>
              {i > 0 && " "}
              <span
                ref={element => { optionRefs.current[i] = element; }}
                role="option"
                className={"pathway-reading__word" + (fill ? " pathway-reading__word--colored" : "")
                  + (note ? " pathway-reading__word--noted" : "")}
                aria-label={note && noteName(note)}
                aria-selected={i === current}
                tabIndex={i === tabStop ? 0 : -1}
                style={fill && { backgroundColor: fill.background, color: fill.text }}
                onFocus={event => {
                  onCurrentChange(i);
                  events.focus(target(event.currentTarget));
                }}
                onBlur={() => events.focus(undefined)}
                onPointerEnter={event => events.hover(target(event.currentTarget))}
                // Where the pointer went, so it can move onto the tooltip.
                onPointerLeave={event => events.hover(undefined, event.relatedTarget)}
                onKeyDown={event => onKeyDown(event, i)}
              >
                {word}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
