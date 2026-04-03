# StandardScaler Row for Heatmap Visualization

## Summary

Add a toggleable row at the bottom of the heatmap visualization that exposes the StandardScaler transformation. This makes the previously hidden standardization step visible by showing raw activations alongside the scaler's mean and scale (std dev) parameters.

## Motivation

All heatmaps in the current visualization display standardized values, but the StandardScaler transformation is invisible. Exposing raw activations, scaler mean, and scaler scale helps users understand how `standardized = (raw - mean) / scale` works per neuron.

## Design

### New UI: "Show Scaler" Checkbox

A new checkbox in the toolbar, alongside the existing "Show stats" checkbox. Off by default. When checked, a new Row 5 appears below the existing Row 4 (Original/Sum/Noise).

### New Row 5 Layout

Follows the existing 2-column grid pattern (300px left column, 1fr right column):

**Column 1 — Raw Activations:**
- Heatmap of `review.activations_raw` for the currently selected review
- Changes when the user selects a different review
- Has its own inline `ColorLegend` below the heatmap, scaled to its own absMax

**Column 2 — Scaler Mean + Scaler Scale:**
- Two heatmaps side by side (same layout pattern as Sum + Noise in Row 4)
- **Scaler Mean:** `data.scaler.mean` (780 values, same for all reviews)
- **Scaler Scale:** `data.scaler.scale` (780 values, same for all reviews)
- Each has its own inline `ColorLegend` below, scaled to its own absMax

### Color Scaling

These 3 heatmaps are independent from the existing scale mode system (`current-review`, `same-across-reviews`, `multiple-scales`). Each heatmap computes its own absMax from its own data and renders its own color legend. This is necessary because:
- Raw activations are in a different numeric range than standardized values
- Scaler mean and scale have their own distinct ranges
- Sharing a scale with standardized heatmaps would make one or the other unreadable

The heatmaps still respect the global `scaleType` (color scheme) and `valueScaling` (linear/exponential/logarithmic) settings.

### Files to Modify

- `src/heatmap/components/app.tsx` — Add `showScaler` state, toolbar checkbox, new Row 5 with conditional rendering
- `src/heatmap/components/app.scss` — Add grid row for Row 5, styles for the new section

### Data Already Available

No data pipeline changes needed. The required fields already exist:
- `review.activations_raw` — per-review raw activations (780 values)
- `data.scaler.mean` — per-neuron training mean (780 values)
- `data.scaler.scale` — per-neuron training std dev (780 values)
