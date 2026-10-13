import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

export const InvestigatePathways: React.FC = () => (
  <ViewPlaceholder className="investigate-pathways" title="Investigate Pathways" about={about} />
);
