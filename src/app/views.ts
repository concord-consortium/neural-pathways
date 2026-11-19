import React from "react";
import type { AnyModel, ModelClass } from "mobx-keystone";
import { LookingInsideState } from "../views/looking-inside/looking-inside-state";
import { LOOKING_INSIDE_TITLE, LookingInside } from "../views/looking-inside/looking-inside";
import { ExtractPathwaysState } from "../views/extract-pathways/extract-pathways-state";
import { EXTRACT_PATHWAYS_TITLE, ExtractPathways } from "../views/extract-pathways/extract-pathways";
import { INVESTIGATE_PATHWAYS_TITLE, InvestigatePathways } from "../views/investigate-pathways/investigate-pathways";
import { MODEL_REASONING_TITLE, ModelReasoning } from "../views/model-reasoning/model-reasoning";
import { CONTEXTUAL_FACTORS_TITLE, ContextualFactors } from "../views/contextual-factors/contextual-factors";
import { CORRELATIONS_TITLE, Correlations } from "../views/correlations/correlations";

export interface ViewDef {
  /** Used in `?interactive=<id>` and `#view=<id>`. See src/app/README.md before renaming or removing one. */
  id: string;
  title: string;
  component: React.ComponentType;
  /** The model for this view's own state, if it keeps any. See docs/view-state.md. */
  stateModel?: ModelClass<AnyModel>;
}

/** The lesson's views, in lesson order. This order is the navigation order. */
export const VIEWS: readonly ViewDef[] = [
  { id: "looking-inside", title: LOOKING_INSIDE_TITLE, component: LookingInside, stateModel: LookingInsideState },
  {
    id: "extract-pathways", title: EXTRACT_PATHWAYS_TITLE, component: ExtractPathways,
    stateModel: ExtractPathwaysState,
  },
  { id: "investigate-pathways", title: INVESTIGATE_PATHWAYS_TITLE, component: InvestigatePathways },
  { id: "model-reasoning", title: MODEL_REASONING_TITLE, component: ModelReasoning },
  { id: "contextual-factors", title: CONTEXTUAL_FACTORS_TITLE, component: ContextualFactors },
  { id: "correlations", title: CORRELATIONS_TITLE, component: Correlations },
];

export function findView(id: string): ViewDef | undefined {
  return VIEWS.find(view => view.id === id);
}
