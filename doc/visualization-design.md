# Neural Pathway Visualization — Design

## Concept

This visualization shows how neural pathways decompose neuron activations from a distilbert ML model trained on Yelp reviews. It uses a **heat/cold metaphor** — each pathway adds heat or cold to a baseline temperature, and the sum of all pathways reconstructs the original neuron activation pattern.

- **Hot** (red) = positive activation
- **Cold** (blue) = negative activation
- **Neutral** (gray) = zero

This metaphor supports both addition and subtraction symmetrically, unlike light+opacity which has asymmetric bounds.

## Data

Source: `viz_data.json` (780 neurons, 6 pathways, 10 reviews)

Each review has standardized neuron activations (780 values). The pathways are computed via factor analysis, where each pathway is a vector of 780 coefficients. Each review gets a score per pathway.

**Reconstruction math:**

```
review_activations ≈ Σ(pathway_score[i] × pathway_coefficients[i])
```

The mean is effectively zero (data is standardized), so it's omitted from the visualization.

Pathway 1 explains ~85.5% of variance. Pathways 2–6 each explain 0.4–2.3%.

## Layout

The page is a 2-column, 2-row CSS grid:

```
┌─────────────────┐ ┌──────────────────────────────────────────────────┐
│ Review selector  │ │  P1      P2      P3      P4      P5      P6     │
│ Sentiment        │ │  [heat]  [heat]  [heat]  [heat]  [heat]  [heat] │ Unscored
│ Review text      │ │  [score] [score] [score] [score] [score] [score]│ Scores
│                  │ │  [heat] + [heat] + [heat] + [heat] + [heat] + [heat] │ Scored
│                  │ │  =                                               │
├─────────────────┤ ├──────────────────────────────────────────────────┤
│ Original         │ │  Sum                                             │
│ Activations      │ │  [heat]                                          │
│ [heat]           │ │                                                  │
└─────────────────┘ └──────────────────────────────────────────────────┘
```

- **Top-left**: Review selection (dropdown with snippets), sentiment label, full review text
- **Top-right**: The pathway grid — three rows showing unscored patterns, editable scores, and the scored formula with `+` operators between terms, followed by a rotated `=`
- **Bottom-left**: The review's original neuron activations
- **Bottom-right**: The sum of all scored pathways

The bottom row is for comparison — the original activations and the sum are horizontally aligned so differences are easy to spot.

## Heatmap Rendering

Each heatmap displays 780 neurons as a **26×30 grid of circles** on an HTML5 canvas. The circle/dot-matrix style gives an organic look. Canvases render at the display's `devicePixelRatio` for crisp circles on HiDPI/Retina screens.

All heatmaps have a **white background** so the heatmap boundary is visible even when most values are near zero.

### Color Scales

A dropdown lets the user switch between three rendering scales:

- **Fixed size: blue → white → red** — The default. Circle size is constant; color interpolates from blue (negative) through white (zero) to red (positive). The white heatmap background makes zero-valued circles invisible, so non-zero activations stand out clearly.
- **Fixed size: blue → gray → red** — Same as above but with gray as the zero midpoint. Gray circles are visible against the white background, showing all neuron positions regardless of value.
- **Size based on value** — Circle radius scales with the absolute magnitude of the value. Color is a fixed shade of blue (negative) or red (positive). Near-zero values shrink to nothing, emphasizing strong activations.

All scales share a single **fixed range** symmetric around zero, computed from the global min/max across all displayed data. The range updates when pathway scores change.

## Interactivity

### Review Selection
A dropdown selects among the 10 reviews. Changing the review resets all pathway scores to their original values.

### Editable Pathway Scores
Each pathway score has a numeric input and a range slider (range: -3 to +3). Users can "mess up" the equation by changing scores to see how it affects the sum. A reset button appears when a score differs from its original value.

### Show Stats
A toolbar checkbox toggles display of per-heatmap statistics (min, max, absMax) below each heatmap. When enabled, the color legend also shows the numeric range instead of "cold"/"hot" labels.

### Summation Animation

A play/pause button and scrubber control an animation that visually demonstrates how the scored pathways combine into the sum. The animation uses CSS 3D transforms with perspective to create a physical "stacking" metaphor. It proceeds through five phases:

**Phase 1 — Tilt** (0–20%): The `+` operators fade out and each heatmap rotates 80 degrees around its vertical center axis (right edge goes back). The camera stays fixed.

**Phase 2 — Orbit** (20–40%): The camera orbits 45 degrees to the right, revealing the row of tilted heatmaps from an angled view. Perspective makes farther heatmaps appear smaller.

**Phase 3 — Align** (40–60%): Each heatmap slides along its own tilted plane until all centers lie on a line perpendicular to the heatmap faces. P6 (rightmost) stays fixed; others slide toward it. Because of perspective, the farther heatmaps still appear smaller than the closer ones.

**Phase 4 — Merge & Collapse** (60–80%): The back heatmaps move forward to P6's depth plane, closing the depth gaps. Simultaneously, the data merges back-to-front: P1 keeps its own data, P2 blends in a growing portion of P1's values, P3 blends in the computed P2, and so on. At the end of this phase, P6 displays the full cumulative sum of all pathways.

**Phase 5 — Face camera** (80–100%): The stacked sandwich of heatmaps and the camera both rotate back to their original orientations, so the merged result faces the viewer straight on.

### Future Interactions (not yet implemented)
- **Interactive toggle**: Checkboxes to toggle individual pathways on/off
