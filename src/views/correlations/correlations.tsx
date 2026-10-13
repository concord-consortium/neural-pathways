import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

export const Correlations: React.FC = () => (
  <ViewPlaceholder className="correlations" title="Correlations" about={about} />
);
