/**
 * Whether a key press belongs to an IME composition in progress: Enter or Escape then finishes or
 * cancels the composition, so the filter mustn't act on it. Safari reports the key that ends a
 * composition as keyCode 229, with isComposing false.
 */
export function isComposing(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}
