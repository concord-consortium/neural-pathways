import { autoUpdate, computePosition, hide, Middleware, offset, shift } from "@floating-ui/dom";
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { pathwayName, signedScore, WordScoreNote } from "./word-score-text";
import "./word-tooltip.scss";

/**
 * A word the pointer or the focus moved to: its element, to place the tooltip over, and what to say.
 * A word that scores on no pathway has no note and shows no tooltip, but still counts as where the
 * pointer or the focus moved last.
 */
export interface WordTarget {
  element: HTMLElement;
  note?: WordScoreNote;
}

/** A word with a tooltip to show. */
type NotedTarget = Required<WordTarget>;

/** How a word reports the pointer and the focus to the tooltip. */
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
  // The most recent move wins. When the focus moves to another word, as an arrow key moves it on from
  // a clicked word, the word under the pointer loses the tooltip. The pointer entering a word takes it
  // back.
  if (action.type === "focus" && target && target.element !== state.hovered?.element) {
    next.hovered = undefined;
  }
  if (target && state.dismissed.includes(target.element)) {
    next.dismissed = state.dismissed.filter(element => element !== target.element);
  }
  return next;
}

const hasNote = (target: WordTarget): target is NotedTarget => target.note !== undefined;

/** The word to show the tooltip over, if any. */
const visibleTarget = (state: TooltipState): NotedTarget | undefined => {
  const target = shownTarget(state);
  return target && hasNote(target) && !state.dismissed.includes(target.element) ? target : undefined;
};

// The gap between the word and the tooltip, which the tooltip's pointer fills.
const POINTER_SIZE = 6;

/** Runs last, so it reads the tooltip's final left: where the word's center is from that left. */
const pointerLeft: Middleware = {
  name: "pointerLeft",
  fn: ({ x, rects }) => ({ data: { left: rects.reference.x + rects.reference.width / 2 - x } }),
};

/**
 * Places the tooltip centered over the word and kept inside the area's sides, with its pointer over
 * the word. It is hidden while the word is scrolled wholly out of view.
 */
async function placeTooltip(tooltip: HTMLElement, word: HTMLElement, area: HTMLElement) {
  const { x, y, middlewareData } = await computePosition(word, tooltip, {
    placement: "top",
    middleware: [offset(POINTER_SIZE), shift({ boundary: area }), hide(), pointerLeft],
  });
  return { x, y, pointer: middlewareData.pointerLeft.left as number, hidden: !!middlewareData.hide?.referenceHidden };
}

/**
 * Places the tooltip over the word, and again whenever the word or the tooltip moves or changes size,
 * or anything around the word scrolls.
 */
function useTooltipPlacement(tooltipRef: React.RefObject<HTMLElement | null>,
  areaRef: React.RefObject<HTMLElement | null>, word: HTMLElement | undefined) {
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const area = areaRef.current;
    if (!word || !tooltip || !area) {
      return;
    }
    let active = true;
    const place = () => {
      void placeTooltip(tooltip, word, area).then(({ x, y, pointer, hidden }) => {
        if (!active) {
          return;
        }
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        // The pointer's left is measured from inside the tooltip's border.
        tooltip.style.setProperty("--word-tooltip-pointer", `${pointer - tooltip.clientLeft}px`);
        tooltip.style.visibility = hidden ? "hidden" : "";
      });
    };
    const stop = autoUpdate(word, tooltip, place);
    return () => {
      active = false;
      stop();
    };
  }, [tooltipRef, areaRef, word]);
}

interface WordTooltipAreaProps {
  className?: string;
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
 * leaves both the word and the tooltip, the focus leaves the word, or the pointer or the focus moves
 * to another word.
 * It is hidden from screen readers, since the word's name says the same thing.
 */
export const WordTooltipArea: React.FC<WordTooltipAreaProps> = ({ className, children }) => {
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

  useTooltipPlacement(tooltipRef, areaRef, shown?.element);

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

  return (
    <WordTooltipContext.Provider value={events}>
      <div ref={areaRef} className={`word-tooltip-area${className ? ` ${className}` : ""}`}>
        {children}
        {shown &&
          // One the focus opened lets the pointer through to the words it covers. Only one the pointer
          // opened must take the pointer, so the pointer can move onto it.
          <div ref={tooltipRef} className={`word-tooltip${state.hovered ? "" : " word-tooltip--focused"}`}
            aria-hidden="true" onPointerLeave={() => dispatch({ type: "hover", target: undefined })}>
            {shown.note.word}:{" "}
            {shown.note.kind === "score"
              ? <span className="word-tooltip__value">{signedScore(shown.note.value)}</span>
              : `a ${pathwayName(shown.note.pathway)} word`}
          </div>}
      </div>
    </WordTooltipContext.Provider>
  );
};
