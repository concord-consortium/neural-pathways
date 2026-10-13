/** A width and height, in CSS px. */
export interface Size {
  width: number;
  height: number;
}

/** How far the dialog hangs below its button, and how far it is kept inside the window. */
const DROP = 6;
const MARGIN = 10;

/**
 * Where the About dialog goes, in the window's coordinates: below its button with their right edges
 * aligned, as in the prototype, and kept inside the window. A dialog too low to fit moves up until it
 * does, but never past the top margin: the dialog's CSS keeps it short enough to fit.
 */
export function placeDialog(button: { right: number; bottom: number }, dialog: Size, view: Size) {
  const left = Math.max(MARGIN, Math.min(button.right - dialog.width, view.width - MARGIN - dialog.width));
  const top = Math.max(MARGIN, Math.min(button.bottom + DROP, view.height - MARGIN - dialog.height));
  return { top, left };
}
