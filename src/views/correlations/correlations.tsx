import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const CORRELATIONS_TITLE = "Correlations";

export const Correlations: React.FC = () => (
  <ViewPlaceholder className="correlations" title={CORRELATIONS_TITLE} about={about} />
);
