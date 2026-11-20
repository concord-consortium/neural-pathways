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
  /** The word the pointer moved to, unless the focus has moved to another word since. */
  hovered?: WordTarget;
  focused?: WordTarget;
  /**
   * The words Escape hid the tooltip for: the hovered and the focused word at the time. Each stays
   * hidden until the pointer or the focus moves to it again, so leaving another word doesn't bring
   * one back.
   */
  dismissed: readonly HTMLElement[];
}

type TooltipAction =
  | { type: "hover"; target: WordTarget | undefined }
  | { type: "focus"; target: WordTarget | undefined }
  | { type: "dismiss" };

/** The word the pointer or the focus moved to last, or else the focused one. */
const shownTarget = (state: TooltipState) => state.hovered ?? state.focused;

function reduceTooltip(state: TooltipState, action: TooltipAction): TooltipState {
  if (action.type === "dismiss") {
    const dismissed = [state.hovered?.element, state.focused?.element]
      .filter((element): element is HTMLElement => !!element);
    return { ...state, dismissed };
  }
  const { target } = action;
  const next = action.type === "hover" ? { ...state, hovered: target } : { ...state, focused: target };
  // The most recent move wins: the focus moving to another word takes the tooltip from the word under
  // the pointer, which a click or an arrow key leaves there. Entering a word takes it back.
  if (action.type === "focus" && target && target.element !== state.hovered?.element) {
    next.hovered = undefined;
  }
  if (target && state.dismissed.includes(target.element)) {
    next.dismissed = state.dismissed.filter(element => element !== target.element);
  }
  return next;
}

/** The word to show the tooltip over, if any. */
const visibleTarget = (state: TooltipState) => {
  const target = shownTarget(state);
  return target && !state.dismissed.includes(target.element) ? target : undefined;
};

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
 * A box around a card's readings that shows one tooltip for them all: the score of the word the
 * pointer or the focus moved to last, or, once the pointer leaves it, of the focused word. The tooltip
 * is drawn in this box, outside the readings' scroller, so the scroller doesn't clip it. Key the area
 * by the message, so a new message starts with no tooltip.
 *
 * It meets WCAG 1.4.13: Escape hides it without moving the focus, until the pointer or the focus next
 * moves to a word; the pointer can move onto one the pointer opened; and it stays until the pointer
 * leaves both the word and the tooltip or the focus leaves the word.
 * It is hidden from screen readers, since the word's name says the same thing.
 */
export const WordTooltipArea: React.FC<WordTooltipAreaProps> = ({ className, scrollerRef, children }) => {
  const [state, dispatch] = useReducer(reduceTooltip, { dismissed: [] });
  const areaRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const shown = visibleTarget(state);

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

  // Escape hides the tooltip wherever the focus is, since a tooltip the pointer opened shows while the
  // focus is outside the area. The key is left to reach anything else that wants it, and the focus
  // stays where it is.
  const showing = !!shown;
  useEffect(() => {
    if (!showing) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatch({ type: "dismiss" });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showing]);

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
        onScrollCapture={place}>
        {children}
        {shown &&
          // One the focus opened lets the pointer through to the words it covers. Only one the pointer
          // opened must take the pointer, so the pointer can move onto it.
          <div ref={tooltipRef} className={`word-tooltip${state.hovered ? "" : " word-tooltip--focused"}`}
            aria-hidden="true" onPointerLeave={onTooltipPointerLeave}>
            {shown.note.word}:{" "}
            {shown.note.kind === "score"
              ? <span className="word-tooltip__value">{signedScore(shown.note.value)}</span>
              : `a ${pathwayName(shown.note.pathway)} word`}
          </div>}
      </div>
    </WordTooltipContext.Provider>
  );
};
