import React from "react";
import "./loading-legend.scss";

/**
 * Names what a loading bar shows: a bar running left from the middle is a negative loading, in blue,
 * and one running right is a positive loading, in orange. The two stacked bars are a sample of the
 * encoding itself. They are hidden from assistive technology; the signs say the same.
 */
export const LoadingLegend: React.FC = () => (
  <div className="loading-legend">
    <span className="loading-legend__caption">Loading</span>{" "}
    <span className="loading-legend__row">
      <span>−</span>{" "}
      <span className="loading-legend__bars" aria-hidden="true">
        <span className="loading-legend__bar loading-legend__bar--negative" />
        <span className="loading-legend__bar loading-legend__bar--positive" />
      </span>{" "}
      <span>+</span>
    </span>
  </div>
);
