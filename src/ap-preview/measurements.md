# Measurements

The numbers `ap-sizing.ts` is checked against, and how they were measured. They come from the
deployed Activity Player, `activity-player.concord.org/branch/master`, at activity-player
3a38f74d. When the Activity Player changes how it sizes an Interactive, measure again and update
these numbers, the formulas in `ap-sizing.ts` and the tests in `ap-sizing.test.ts`.

## How they were measured

Open an activity in Chrome with a managed interactive in a section, and change the classes in
DevTools rather than authoring a section for each layout:
- the page: `fixed-width-1100px` or `fixed-width-ipad_friendly` on the `.activity` element;
- the section: `full-width`, `l_6040`, `r_4060`, `l_7030` or `r_3070` on the `.section` element.

Read each column's width, and the iframe's width and height, from the elements' boxes. Size the
window with DevTools' device toolbar, so its height is exact.

W is the Activity Player's `#app` width: the window's `innerWidth`, less the scrollbar when the
browser shows a classic one. H is `window.innerHeight`. The preview takes W from
`document.documentElement.clientWidth`.

## Column widths

The interactive's iframe is its column's width. Primary / secondary, in px:

| Layout | 1100 px page | 960 px page |
|---|---|---|
| full-width | 1044 | 904 |
| 60-40 | 622.4 / 411.6 | 538.4 / 355.6 |
| 70-30 | 727.8 / 306.2 | 629.8 / 264.2 |
| 40-60 | 656 / 378 | 562.7 / 331.3 |
| 30-70 | 767 / 267 | 658.1 / 235.9 |

These were measured. The window's width doesn't change them. The responsive layouts depend only on
W, and their widths are worked out from the Activity Player's CSS:

| Layout | Primary | Secondary |
|---|---|---|
| responsive-full-width | W − 140 | – |
| responsive-30-70 | W − 515 | 365 |
| responsive-50-50 | (W − 120)/2 − 30 | (W − 120)/2 |

On a 1024 px landscape iPad, whose scrollbars overlay, a responsive-full-width iframe is 884 px
wide.

## Heights

- **Default aspect ratio, capped,** measured. A 1400 × 600 window, a full-width section on the
  1100 px page: the iframe is 784 × 573. The cap is 0.98 × 600 − 15 = 573, and the width narrows to
  0.98 × 600 × 4/3 = 784.
- **Around the iframe,** from the Activity Player's CSS. The title bar is 36 px, the managed interactive's border 1 px top and
  bottom, and the space below the iframe 30 px: 68 px that the height cap leaves out.
- **Nothing above the section** (the Activity Player's header, nav or banners) changes an
  iframe's size. Its height comes only from `innerHeight` and `98vh`.
