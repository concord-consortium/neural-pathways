import React, { useCallback, useEffect, useState } from "react";

/** How a scroller is named while it is a Tab stop. */
export type ScrollerName = { role: "group" | "region" } & ({ "aria-labelledby": string } | { "aria-label": string });

function overflows(element: Element): boolean {
  return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

/**
 * Makes an element that only sometimes scrolls reachable by the keyboard in every browser. Chromium
 * makes a scroller with nothing focusable inside it a Tab stop on its own; Safari doesn't. While
 * the element overflows, or has the focus, it is a Tab stop with the role and name given: `region`
 * when it is what its heading names, `group` when an enclosing landmark already has that name.
 * Staying a Tab stop while it has the focus means a resize that ends the overflow doesn't drop the
 * focus to the page, as Chromium's own does.
 *
 * Only for a scroller with nothing focusable inside: Tab already reaches, and scrolls to, anything
 * that is. Where there is no ResizeObserver (jsdom), the element never counts as overflowing.
 * Returns a ref for the element and the props to spread on it.
 */
export function useKeyboardScrollable<T extends HTMLElement>(name: ScrollerName) {
  const [element, setElement] = useState<T | null>(null);
  const [scrolls, setScrolls] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const check = () => setScrolls(overflows(element));
    // The content can change size while the element doesn't, so its children are watched too.
    const resizes = new ResizeObserver(check);
    const observeAll = () => {
      resizes.disconnect();
      resizes.observe(element);
      for (const child of Array.from(element.children)) {
        resizes.observe(child);
      }
    };
    // And the content can be replaced.
    const replacements = new MutationObserver(() => {
      observeAll();
      check();
    });
    observeAll();
    replacements.observe(element, { childList: true });
    return () => {
      resizes.disconnect();
      replacements.disconnect();
    };
  }, [element]);

  const onFocus = useCallback((event: React.FocusEvent<T>) => {
    if (event.target === event.currentTarget) {
      setFocused(true);
    }
  }, []);
  const onBlur = useCallback((event: React.FocusEvent<T>) => {
    if (event.target === event.currentTarget) {
      setFocused(false);
    }
  }, []);

  const props = scrolls || focused ? { tabIndex: 0, ...name, onFocus, onBlur } : { onFocus, onBlur };
  return [setElement, props] as const;
}
