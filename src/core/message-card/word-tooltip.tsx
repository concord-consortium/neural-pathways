import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef }
  from "react";
import { pathwayName, signedScore, WordScoreNote } from "./word-score-text";
import "./word-tooltip.scss";

/** A word that can show the tooltip: its element, to place the tooltip over, and what to say. */
export interface WordTarget {
  element: HTMLElement;
  note: WordScoreNote;
}

/** How a word reports the pointer and the focus to the tooltip. A word with no note sends `undefined`. */
export interface WordTooltipEvents {
  /** The pointer entered a word, or, with `undefined`, left one for `to`. */
  hover(target: WordTarget | undefined, to?: EventTarget | null): void;
  /** A word took the focus, or, with `undefined`, lost it. */
  focus(target: WordTarget | undefined): void;
}

const noEvents: WordTooltipEvents = { hover: () => undefined, focus: () => undefined };

const WordTooltipContext = createContext<WordTooltipEvents>(noEvents);

/** The events of the area around the caller. Without an area, they do nothing. */
export const useWordTooltipEvents = (): WordTooltipEvents => useContext(WordTooltipContext);

interface TooltipState {
  hovered?: WordTarget;
  focused?: WordTarget;
  /** Escape hid the tooltip. It stays hidden until it would show over another word. */
  dismissed: boolean;
}

type TooltipAction =
  | { type: "hover"; target: WordTarget | undefined }
  | { type: "focus"; target: WordTarget | undefined }
  | { type: "dismiss" };

/** The word under the pointer, or else the focused one. */
const shownTarget = (state: TooltipState) => state.hovered ?? state.focused;

function reduceTooltip(state: TooltipState, action: TooltipAction): TooltipState {
  if (action.type === "dismiss") {
    return state.dismissed ? state : { ...state, dismissed: true };
  }
  const next = action.type === "hover" ? { ...state, hovered: action.target } : { ...state, focused: action.target };
  if (shownTarget(next)?.element !== shownTarget(state)?.element) {
    next.dismissed = false;
  }
  return next;
}

// The gap between the word and the tooltip, which the tooltip's pointer fills.
const POINTER_SIZE = 6;

/**
 * Places the tooltip, in the area's coordinates, centered over the word and kept inside the area's
 * sides. Its pointer stays over the word. It is hidden while the word is scrolled wholly out of the
 * scroller's view.
 */
function placeTooltip(tooltip: HTMLElement, word: HTMLElement, area: HTMLElement, scroller: HTMLElement | null) {
  const wordBox = word.getBoundingClientRect();
  const areaBox = area.getBoundingClientRect();
  const tooltipBox = tooltip.getBoundingClientRect();
  const wordCenter = wordBox.left + wordBox.width / 2 - areaBox.left;
  const maxLeft = Math.max(0, areaBox.width - tooltipBox.width);
  const left = Math.min(Math.max(wordCenter - tooltipBox.width / 2, 0), maxLeft);
  const top = wordBox.top - areaBox.top - POINTER_SIZE - tooltipBox.height;
  const scrollerBox = scroller?.getBoundingClientRect();
  const outOfView = !!scrollerBox && (wordBox.bottom <= scrollerBox.top || wordBox.top >= scrollerBox.bottom);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.setProperty("--word-tooltip-pointer", `${wordCenter - left}px`);
  tooltip.style.visibility = outOfView ? "hidden" : "";
}

interface WordTooltipAreaProps {
  className?: string;
  /** The readings' scroller, so the tooltip hides while its word is scrolled out of view. */
  scrollerRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * A box around a card's readings that shows one tooltip for them all: the score of the word under
 * the pointer, or else of the focused word. The tooltip is drawn in this box, outside the readings'
 * scroller, so the scroller doesn't clip it. Key the area by the message, so a new message starts
 * with no tooltip.
 *
 * It meets WCAG 1.4.13: Escape hides it without moving the focus, the pointer can move onto it,
 * and it stays until the pointer leaves both the word and the tooltip or the focus leaves the word.
 * It is hidden from screen readers, since the word's name says the same thing.
 */
export const WordTooltipArea: React.FC<WordTooltipAreaProps> = ({ className, scrollerRef, children }) => {
  const [state, dispatch] = useReducer(reduceTooltip, { dismissed: false });
  const areaRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const shown = state.dismissed ? undefined : shownTarget(state);

  const events = useMemo<WordTooltipEvents>(() => ({
    hover(target, to) {
      // Moving from the word onto the tooltip keeps it, so the pointer can reach it.
      if (!target && to instanceof Node && tooltipRef.current?.contains(to)) {
        return;
      }
      dispatch({ type: "hover", target });
    },
    focus(target) {
      dispatch({ type: "focus", target });
    },
  }), []);

  const place = useCallback(() => {
    const tooltip = tooltipRef.current;
    const area = areaRef.current;
    if (shown && tooltip && area) {
      placeTooltip(tooltip, shown.element, area, scrollerRef?.current ?? null);
    }
  }, [shown, scrollerRef]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    const area = areaRef.current;
    if (!shown || !area || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(place);
    observer.observe(area);
    return () => observer.disconnect();
  }, [shown, place]);

  // Escape is left to reach anything else that wants it, and the focus stays where it is.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && shown) {
      dispatch({ type: "dismiss" });
    }
  };

  // Leaving the tooltip for anywhere but its word ends the hover.
  const onTooltipPointerLeave = (event: React.PointerEvent) => {
    const to = event.relatedTarget;
    if (to instanceof Node && state.hovered?.element.contains(to)) {
      return;
    }
    dispatch({ type: "hover", target: undefined });
  };

  return (
    <WordTooltipContext.Provider value={events}>
      <div ref={areaRef} className={`word-tooltip-area${className ? ` ${className}` : ""}`}
        onKeyDown={onKeyDown} onScrollCapture={place}>
        {children}
        {shown &&
          <div ref={tooltipRef} className="word-tooltip" aria-hidden="true" onPointerLeave={onTooltipPointerLeave}>
            {shown.note.word}:{" "}
            {shown.note.kind === "score"
              ? <span className="word-tooltip__value">{signedScore(shown.note.value)}</span>
              : `a ${pathwayName(shown.note.pathway)} word`}
          </div>}
      </div>
    </WordTooltipContext.Provider>
  );
};
