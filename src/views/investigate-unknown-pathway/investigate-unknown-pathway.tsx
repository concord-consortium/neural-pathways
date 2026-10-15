import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const INVESTIGATE_UNKNOWN_PATHWAY_TITLE = "Investigate Unknown Pathway";

export const InvestigateUnknownPathway: React.FC = () => (
  <ViewPlaceholder className="investigate-unknown-pathway" title={INVESTIGATE_UNKNOWN_PATHWAY_TITLE} about={about} />
);
