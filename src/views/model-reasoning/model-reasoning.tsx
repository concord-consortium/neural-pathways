import React from "react";
import { ViewPlaceholder } from "../../core/view-placeholder/view-placeholder";
import about from "./about.md";

/** The view's title, in its heading, its About and the app's list of views. */
export const MODEL_REASONING_TITLE = "Neural Pathway View of Model Reasoning";

export const ModelReasoning: React.FC = () => (
  <ViewPlaceholder className="model-reasoning" title={MODEL_REASONING_TITLE} about={about} />
);
