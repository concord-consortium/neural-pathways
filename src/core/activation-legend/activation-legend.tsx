import React from "react";
import "./activation-legend.scss";

/**
 * Names the colors a neuron is filled with: blue from the middle down for a negative activation,
 * orange from the middle up for a positive one. The swatches are miniature neurons, so the key is a
 * sample of the encoding itself. They are hidden from assistive technology; the signs say the same.
 * The spaces between the pieces are dropped from the layout, but keep the caption and signs apart
 * for a screen reader.
 */
export const ActivationLegend: React.FC = () => (
  <div className="activation-legend">
    <span className="activation-legend__caption">Neuron Activation</span>{" "}
    <span className="activation-legend__row">
      <span className="activation-legend__swatch activation-legend__swatch--negative" aria-hidden="true" />
      <span className="activation-legend__minus">−</span>{" "}
      <span className="activation-legend__swatch activation-legend__swatch--positive" aria-hidden="true" />
      <span>+</span>
    </span>
  </div>
);
