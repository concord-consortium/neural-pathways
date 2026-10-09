# neural-pathways

## Accessibility

Before drawing text in an SVG or canvas, or sizing anything to fit its container, read
[docs/accessibility.md](docs/accessibility.md). In short: never scale text to fit its container,
since that stops browser zoom from enlarging it (WCAG 1.4.4). Draw at full size, and let a drawing
that is too wide scroll sideways in its own keyboard-reachable region.
