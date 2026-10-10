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
the damage: a canvas scaled down to no less than 0.75 can grow its captions as little as 1.5× at
200% zoom, not 2×.

**What's fine.**
- Graphics with no text, such as the lab's histogram bars (`preserveAspectRatio="none"`).
- A fixed factor that doesn't depend on the container, such as an animation's bounce.
- An SVG drawn at full size, one drawing unit to a CSS pixel (`width` and `height` equal to its
  `viewBox`), even if its layout widens to fill the container. The network diagram works this way.

**When the container is too narrow.** Below the narrowest width a drawing can be laid out at, let
it scroll sideways in its own region rather than scale it down. See
[Design each view down to a narrowest width](#design-each-view-down-to-a-narrowest-width).

**Check it.** Zoom to 200% in a frame as narrow as the lesson will be embedded in, and compare a
label's rendered size with its size at 100%: it should be twice as big. A Playwright context can
stand in for 200% zoom: a viewport half as wide and half as tall, with `deviceScaleFactor: 2`.
Zoom shrinks both dimensions in CSS pixels, so halving only the width would let text sized in `vh`
pass when it shouldn't. Compare in device pixels, a CSS size times the `deviceScaleFactor`,
against a context at the full size with `deviceScaleFactor: 1`.

## Design each view down to a narrowest width

Each view has a narrowest width it is designed for, set by what it has to hold.

1. A comment says what sets it, and the view's README gives the number.
2. At that width or wider, nothing scrolls sideways and nothing is cut off.
3. Below it, nothing may be cut off or unreachable. Drawings scroll sideways in their own region,
   which the keyboard can reach. Text and controls wrap or stack where that's cheap. Scrolling down
   is fine.
4. Text and controls reflowing down to 320 CSS px is a known gap, until the design covers narrow
   screens.

Size the narrowest layout from what it must hold, not from one window's measurement.

**Why.** [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) (AA) asks that
content work at 320 CSS px wide, a 1280 px window at 400% zoom, without scrolling in two
directions. It allows content that needs a two-dimensional layout, such as a diagram, to scroll.
The views' designs don't cover narrow screens yet, and making them work much narrower than they
do is design work. In Extract Pathways, for example, the step row would wrap into several rows
above the canvas, and the steps and the animation they start would no longer fit on screen
together. Until the design covers narrow screens, this is the rule to build and review against.

**Scroll regions.** A drawing's scroll region must work from the keyboard
([2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), A). Chromium and
Firefox make a scroll region with nothing focusable in it reachable by Tab; Safari doesn't.
- Use `useKeyboardScrollable` (`src/core/use-keyboard-scrollable.ts`). It makes the element a Tab
  stop while it overflows, and while it has the focus, so a resize that ends the overflow doesn't
  drop the focus to the page.
- Give the element its role and name all the time, so they don't come and go with the window's
  size. It is a `group` when an enclosing landmark already has its name, as Extract Pathways'
  drawing and Trace a Case's network diagram are, inside panels named by the same heading. Otherwise
  it is a `region` named by its heading, as the observation notes are. A `region` inside a landmark
  with the same name would list the landmark twice.
- It is only for a scroller with nothing focusable inside. Tab already reaches, and scrolls to,
  anything that is.
- A scroll region clips what is drawn outside it, so keep the drawing inside its own box. The
  network diagram leaves room for its winning pill to grow as it pops.

## Keep unavailable buttons in the tab order

A button that can't act right now, such as Previous on the first conversation or Reset with
nothing to reset, is *unavailable*: mark it `aria-disabled="true"`, not with the `disabled`
attribute.

**Why.** A `disabled` button leaves the tab order, and if it has the focus when it becomes
disabled, the browser drops the focus to the page body. A keyboard user stepping with Next would
lose their place at the last conversation, which works against
[2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) (A). An
`aria-disabled` button keeps the focus, and a screen reader still finds it and says it is
unavailable ("dimmed"), so the controls read the same at the ends as in the middle.

**What it takes.** `aria-disabled` only changes what assistive technology hears; the button still
gets clicks, Enter and Space.
- Ignore the press while it is unavailable, as the card's `NavButton` does with `onClick`.
- Style it with the `unavailable` mixin in `src/core/button.scss`. Only its face fades, so its
  focus ring stays clear, and in forced-colors mode it is painted `GrayText`, as a native disabled
  button is. WCAG's contrast minimums don't apply to inactive controls, so the fade is allowed.
