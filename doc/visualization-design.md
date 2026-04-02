# Neural Pathway Visualization — Design

## Concept

This visualization shows how neural pathways decompose neuron activations from a distilbert ML model trained on Yelp reviews. It uses a **heat/cold metaphor** — each pathway adds heat or cold to a baseline temperature, and the sum of all pathways reconstructs the original neuron activation pattern.

- **Hot** (red) = positive activation
- **Cold** (blue) = negative activation
- **Neutral** (white or gray, depending on color scale) = zero

This metaphor supports both addition and subtraction symmetrically, unlike light+opacity which has asymmetric bounds.

## Data

Source: `viz_data.json` (variable number of neurons, pathways, and reviews)

Each review has standardized neuron activations. The pathways are computed via factor analysis, where each pathway is a vector of coefficients (one per neuron). Each review gets a score per pathway, and optionally a `source` label and `reconstruction_r2` value.

**Reconstruction math:**

```
review_activations ≈ Σ(pathway_score[i] × pathway_coefficients[i])
```

The mean is effectively zero (data is standardized), so it's omitted from the visualization.

## Layout

The page is a 2-column CSS grid with a toolbar row, a pathway patterns row, a review-specific row, and a comparison row:

```
┌──────────────────────────────────────────────────────────────────┐
│ Toolbar: color scale, value scaling, scale mode, show stats      │ Row 1
├─────────────────┬────────────────────────────────────────────────┤
│ [color legend    │  P1      P2      P3    ...  Pn                │
│  if fixed scale] │  [heat]  [heat]  [heat] ... [heat]  Unscored  │ Row 2
├─────────────────┼────────────────────────────────────────────────┤ divider
│ Review selector  │  [score] [score] [score]... [score]  Scores   │
│ Sentiment        │  [heat] + [heat] + ... + [heat]      Scored   │
│ Source           │  ▶ ━━━━━━━━━  (animation controls)            │
│ Review text      │  =                                            │ Row 3
│ [color legend    │                                               │
│  if per-review]  │                                               │
├─────────────────┼────────────────────────────────────────────────┤
│ Original         │  Sum       Noise      R²                      │
│ Activations      │  [heat]    [heat]     (if stats)              │ Row 4
│ [heat]           │                                               │
└─────────────────┴────────────────────────────────────────────────┘
```

- **Row 1**: Toolbar spanning both columns with all visualization controls
- **Row 2, Col 1**: Color legend (when scale mode is "same across reviews") or empty
- **Row 2, Col 2**: Pathway patterns — unscored heatmaps showing each pathway's characteristic temperature pattern
- **Divider**: Horizontal line separating review-independent content (above) from review-specific content (below)
- **Row 3, Col 1**: Review selection (dropdown with snippets), sentiment label, source, full review text, and color legend (when scale mode is "current review" or "multiple scales")
- **Row 3, Col 2**: Pathway scores (editable inputs/sliders), scored pathways with `+` operators and summation animation, rotated `=`
- **Row 4, Col 1**: The review's original neuron activations
- **Row 4, Col 2**: Sum of scored pathways, noise (original − sum), and R² percentage (when stats enabled)

## Heatmap Rendering

Each heatmap displays neurons as a **grid of circles** on an HTML5 canvas. Grid dimensions are computed automatically from the data length to produce a roughly square layout. The circle/dot-matrix style gives an organic look. Canvases render at the display's `devicePixelRatio` for crisp circles on HiDPI/Retina screens.

All heatmaps have a **white background** so the heatmap boundary is visible even when most values are near zero.

### Color Scales

A dropdown lets the user switch between four rendering modes:

- **Fixed size: blue → white → red** — The default. Circle size is constant; color interpolates from blue (negative) through white (zero) to red (positive). The white heatmap background makes zero-valued circles invisible, so non-zero activations stand out clearly.
- **Fixed size: blue → gray → red** — Same as above but with gray as the zero midpoint. Gray circles are visible against the white background, showing all neuron positions regardless of value.
- **Multi-hue: blue → cyan → white → yellow → red** — A diverging multi-hue scale that preserves the cool/warm sign distinction while adding more perceptual range within each side, making it easier to distinguish subtle differences in magnitude.
- **Size based on value** — Circle radius scales with the absolute magnitude of the value. Color is a fixed shade of blue (negative) or red (positive). Near-zero values shrink to nothing, emphasizing strong activations.

### Value Scaling

An independent dropdown applies a nonlinear transformation to the normalized values before color/size mapping:

- **Linear** — No transformation (default)
- **Exponential** — Power curve (t²) that compresses small values and emphasizes large ones
- **Logarithmic** — Log curve that emphasizes small values and compresses large ones, making subtle activations more visible

Color scale and value scaling can be combined freely.

### Scale Mode

A "Scale" dropdown controls how the color range is computed:

- **Current review** — The color range is computed from all data displayed for the selected review (pathway patterns, scored pathways, activations, sum, noise). This maximizes contrast for each review but means colors aren't comparable across reviews. The color legend appears in the review panel.
- **Same across reviews** — The color range is fixed to the global maximum across all reviews' original activations. Colors are comparable across reviews but smaller pathways may appear washed out. The color legend appears in row 2, column 1.
- **Multiple scales** — Three independent color ranges, each optimized for its section:
  - **Pathway patterns** — scale based on the raw pathway component values. Legend shown next to the "Pathway patterns" header.
  - **Scored pathways** — scale based on the scored pathway values for the current review. Legend shown next to the "Scored pathways" header.
  - **Activations** — scale based on the original activations, sum, and noise. Legend shown in the review panel.

## Interactivity

### Review Selection
A dropdown selects among the reviews. Each review shows its index, a text snippet, sentiment label (positive/negative), and source (e.g., train/test). Changing the review resets all pathway scores to their original values.

### Editable Pathway Scores
Each pathway score has a numeric input and a range slider (range: -3 to +3). Users can "mess up" the equation by changing scores to see how it affects the sum. A reset button appears when a score differs from its original value.

### Show Stats
A toolbar checkbox toggles display of per-heatmap statistics (min, max, absMax) below each heatmap. When enabled, the color legend also shows the numeric range instead of "cold"/"hot" labels. The reconstruction R² value is also shown next to the noise heatmap.

### Noise Heatmap
The comparison row includes a noise heatmap showing the difference between the original activations and the reconstructed sum (original − sum). This visualizes what the pathways fail to capture.

### Summation Animation

A play/pause button and scrubber control an animation that visually demonstrates how the scored pathways combine into the sum. The animation uses CSS 3D transforms with perspective to create a physical "stacking" metaphor. It proceeds through five phases:

**Phase 1 — Tilt** (0–20%): The `+` operators fade out and each heatmap rotates 80 degrees around its vertical center axis (right edge goes back). The camera stays fixed.

**Phase 2 — Orbit** (20–40%): The camera orbits 45 degrees to the right, revealing the row of tilted heatmaps from an angled view. Perspective makes farther heatmaps appear smaller.

**Phase 3 — Align** (40–60%): Each heatmap slides along its own tilted plane until all centers lie on a line perpendicular to the heatmap faces. The last pathway stays fixed; others slide toward it. Because of perspective, the farther heatmaps still appear smaller than the closer ones.

**Phase 4 — Merge & Collapse** (60–80%): The back heatmaps move forward to the front heatmap's depth plane, closing the depth gaps. Simultaneously, the data merges back-to-front: the first pathway keeps its own data, each subsequent pathway blends in a growing portion of the computed previous pathway's values. At the end of this phase, the front heatmap displays the full cumulative sum of all pathways.

**Phase 5 — Face camera** (80–100%): The stacked sandwich of heatmaps and the camera both rotate back to their original orientations, so the merged result faces the viewer straight on.

### Future Interactions (not yet implemented)
- **Interactive toggle**: Checkboxes to toggle individual pathways on/off
