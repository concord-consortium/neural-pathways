# Accessibility

Rules the student-facing code (`src/app`, `src/views`, `src/core`) follows, with the WCAG 2.2
success criteria behind each. The lessons are used in classrooms, so they have to work for students
who zoom the page, use a keyboard or use a screen reader.

## Don't scale text to fit its container

Text must be drawn at a size that doesn't depend on how wide its container or the window is. Lay
out wider or narrower, wrap, or scroll instead.

**Why.** A student who needs bigger text zooms the browser. Zoom makes each CSS pixel bigger, which
also makes the window and every container fewer CSS pixels wide. Anything scaled to fit its
container is scaled down by the same factor, so its text comes out the same size at 200% zoom as at
100%. The student has no way left to enlarge it.

That fails [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
(AA): text must be resizable to 200% without assistive technology. Sizing text in viewport units
fails it the same way, and WCAG lists that as a failure,
[F94](https://www.w3.org/WAI/WCAG22/Techniques/failures/F94).

**What counts as scaling to fit.**
- An SVG with a `viewBox` drawn at `width: 100%` (or any size taken from its container) when it
  holds `<text>`.
- A CSS `transform: scale()`, or a `zoom`, whose factor comes from the container's size.
- Font sizes in `vw`, `vh`, `vmin` or `vmax`, or a `clamp()` built on them.
- Text drawn into a `<canvas>` sized to fit. Text in a canvas is also an image of text, which
  [1.4.5 Images of Text](https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html) (AA)
  asks you to avoid.

Scaling *up* to fill a wide container counts too. At 200% zoom the container is half as wide, the
factor halves, and the text stays the size it was. A floor or ceiling on the factor only limits
the damage: a canvas scaled down to no less than 0.75, in a 1000 px frame, grows its captions
1.54× at 200% zoom, not 2×.

**What's fine.**
- Graphics with no text, such as the lab's histogram bars (`preserveAspectRatio="none"`).
- A fixed factor that doesn't depend on the container, such as an animation's bounce.
- An SVG drawn at full size, one drawing unit to a CSS pixel (`width` and `height` equal to its
  `viewBox`), even if its layout widens to fill the container. The network diagram works this way.

**When the container is too narrow.** Below the narrowest width a drawing can be laid out at, let
it scroll sideways in its own region, and keep the page from scrolling.
- [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) (AA) allows this for
  content that needs a two-dimensional layout, such as diagrams. Text and controls around the
  drawing still have to reflow at 320 CSS px wide.
- The scroll region must work from the keyboard
  ([2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), A). Chromium
  makes a scroll region with nothing focusable in it reachable by Tab; other browsers may not. If
  it holds nothing focusable, give it `tabIndex={0}` and an accessible name while it overflows.
- Size the narrowest layout from what it must hold, not from one window's measurement, and say in
  a comment what sets it.

**Check it.** Zoom to 200% in a frame as narrow as the lesson will be embedded in, and compare a
label's rendered size with its size at 100%: it should be twice as big. A Playwright context can
stand in for zoom: a viewport half as wide with `deviceScaleFactor: 2`.
