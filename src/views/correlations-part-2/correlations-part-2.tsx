import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const CORRELATIONS_PART_2_TITLE = "Correlations Part 2";

export const CorrelationsPart2: React.FC = () => (
  <ViewPlaceholder className="correlations-part-2" title={CORRELATIONS_PART_2_TITLE} about={about} />
);
