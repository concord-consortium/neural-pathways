import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

export const InvestigateUnknownPathway: React.FC = () => (
  <ViewPlaceholder className="investigate-unknown-pathway" title="Investigate Unknown Pathway" about={about} />
);
