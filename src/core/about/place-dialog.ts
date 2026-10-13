/** A width and height, in CSS px. */
export interface Size {
  width: number;
  height: number;
}

/** How far the dialog hangs below its button, and how far it is kept inside the window. */
const DROP = 6;
const MARGIN = 10;
/** The least room below the button worth hanging the dialog in: a few lines of its text. */
const MIN_ROOM_BELOW = 200;

/**
 * Where the About dialog goes, in the window's coordinates, and how tall it may be. It hangs below
 * its button with their right edges aligned, as in the prototype, no taller than the room below, so
 * a long text scrolls inside it. With too little room below, it moves up until it fits in the window
 * instead. Either way it is kept inside the window. `dialog` is its height with no limit set.
 */
export function placeDialog(button: { right: number; bottom: number }, dialog: Size, view: Size) {
  const left = Math.max(MARGIN, Math.min(button.right - dialog.width, view.width - MARGIN - dialog.width));
  // Never above the top margin: the page can scroll under the dialog, taking the button out of view.
  const below = Math.max(MARGIN, button.bottom + DROP);
  const roomBelow = view.height - MARGIN - below;
  if (roomBelow >= MIN_ROOM_BELOW) {
    return { top: below, left, maxHeight: roomBelow };
  }
  const maxHeight = view.height - 2 * MARGIN;
  const top = Math.max(MARGIN, Math.min(below, view.height - MARGIN - Math.min(dialog.height, maxHeight)));
  return { top, left, maxHeight };
}
