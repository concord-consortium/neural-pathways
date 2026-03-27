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

- **Fixed size: blue → gray → red** — The default. Circle size is constant; color interpolates from blue (negative) through gray (zero) to red (positive). Gray midpoint makes zero values blend into the neutral background.
- **Fixed size: blue → white → red** — Same as above but with white as the zero midpoint. The white heatmap background ensures zero-valued circles are invisible, making non-zero activations stand out more clearly.
- **Size based on value** — Circle radius scales with the absolute magnitude of the value. Color is a fixed shade of blue (negative) or red (positive). Near-zero values shrink to nothing, emphasizing strong activations.

All scales share a single **fixed range** symmetric around zero, computed from the global min/max across all displayed data. The range updates when pathway scores change.

## Interactivity

### Review Selection
A dropdown selects among the 10 reviews. Changing the review resets all pathway scores to their original values.

### Editable Pathway Scores
Each pathway score has a numeric input and a range slider (range: -3 to +3). Users can "mess up" the equation by changing scores to see how it affects the sum. A reset button appears when a score differs from its original value.

### Future Interactions (not yet implemented)
- **Animated stacking**: Animate pathways being added one at a time
- **Interactive toggle**: Checkboxes to toggle individual pathways on/off
