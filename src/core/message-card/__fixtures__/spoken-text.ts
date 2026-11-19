/**
 * An element's text without the parts hidden from screen readers. A list item has no accessible
 * name to query, so tests compare this instead.
 */
export function spokenText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach(hidden => hidden.remove());
  return copy.textContent ?? "";
}
