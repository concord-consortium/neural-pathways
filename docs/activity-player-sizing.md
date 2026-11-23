# How the Activity Player sizes an interactive

The Activity Player sizes an interactive's iframe from the settings an author picks in LARA. An
interactive can instead tell it an aspect ratio or a height through the interactive API; these
rules are for one that doesn't. They were checked against the Activity Player at commit `3a38f74d`
and LARA at `3499f294`.

**Width.** The section's layout and the page's "Activity Page Fixed Width" set it.
- On a fixed page, "Standard (1100px)" or "iPad Friendly (960px)", a "full-width (single column)"
  section's iframe is the page less 56 px of padding and margin: 1044 or 904 px. The window's width
  doesn't change it. In a window narrower than the page and its 80 px of outer padding, the
  Activity Player keeps the page centered: it cuts off as much of the left side as the right, and
  only the right side can be scrolled to.
- The two-column layouts (60-40, 40-60, 70-30, 30-70) split that width into grid columns. The widest
  column, 30-70's primary on the 1100 px page, is 767 px.
- Any section whose layout starts with "responsive" makes the whole page as wide as the window, and
  the fixed width no longer applies to any section on it. A "responsive-full-width (single column)"
  iframe is the window less 140 px: the 80 px of outer padding, the page's 40 px, and a 20 px right
  margin that only a responsive section adds. In responsive-30-70 the secondary column is a fixed
  365 px and the primary gets the rest, the window less 515 px. In responsive-50-50 each column is
  half the window less 120 px, and the primary is 30 px narrower again.

**Height.** The interactive's "Aspect Ratio" sets it.
- "Default aspect ratio, or set by interactive" makes it 3/4 of the width, but no taller than 98% of
  the window's height less 15 px. When that cap applies, the width may also narrow, to 98% of the
  window's height × 4/3. The cap is on the iframe alone: the title bar, the border and the space
  below the iframe add 68 px, so a capped interactive is taller than the window.
- "Manually set the native width & height" makes it the iframe's width × the native height ÷ the
  native width, with no cap.
- "Use all available space for the interactive" stretches it to 98% of the window's height, less
  the title bar, the border and the space below the iframe. It does that in a full-width section,
  and in the primary column of a two-column layout when the embed sets it with Customize or the
  interactive is a basic iframe. Everywhere else the iframe stays at its 300 px default: in a
  responsive-full-width section, in a secondary column, and in a primary column when the embed
  inherits the setting from its library interactive. Each case where the iframe stays 300 px tall
  is a bug in the Activity Player.

The space below the iframe is 30 px of margin. It holds "Clear & start over" when the interactive
saves the student's work and shows that button, and a teacher's feedback once there is some.
Neither one is counted in the heights above, so an interactive that shows them is taller.

These sizes assume:
- **The author gives the interactive a name.** The Activity Player shows the name in a 36 px title
  bar above the iframe, and draws a 1 px border around it. The border sits outside the iframe, so
  it adds 2 px to the height around the iframe but doesn't narrow it. Without a name there is no
  title bar, and a basic iframe interactive has no border either; a managed interactive, an embed
  of a library interactive, keeps its border.
- **A Multiple Pages activity.** The Single Page and Notebook layouts size interactives differently.
