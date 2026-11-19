import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const CONTEXTUAL_FACTORS_TITLE = "Identify Contextual Factors";

export const ContextualFactors: React.FC = () => (
  <ViewPlaceholder className="contextual-factors" title={CONTEXTUAL_FACTORS_TITLE} about={about} />
);
