import React from "react";
import type { AnyModel, ModelClass } from "mobx-keystone";
import { TraceACaseState } from "../views/trace-a-case/trace-a-case-state";
import { TRACE_A_CASE_TITLE, TraceACase } from "../views/trace-a-case/trace-a-case";
import { ExtractPathwaysState } from "../views/extract-pathways/extract-pathways-state";
import { EXTRACT_PATHWAYS_TITLE, ExtractPathways } from "../views/extract-pathways/extract-pathways";
import { INVESTIGATE_PATHWAYS_TITLE, InvestigatePathways } from "../views/investigate-pathways/investigate-pathways";
import { PREDICTION_CHAIN_TITLE, PredictionChain } from "../views/prediction-chain/prediction-chain";
import { CORRELATIONS_TITLE, Correlations } from "../views/correlations/correlations";
import {
  INVESTIGATE_UNKNOWN_PATHWAY_TITLE, InvestigateUnknownPathway,
} from "../views/investigate-unknown-pathway/investigate-unknown-pathway";
import { CORRELATIONS_PART_2_TITLE, CorrelationsPart2 } from "../views/correlations-part-2/correlations-part-2";

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
  { id: "trace-a-case", title: TRACE_A_CASE_TITLE, component: TraceACase, stateModel: TraceACaseState },
  {
    id: "extract-pathways", title: EXTRACT_PATHWAYS_TITLE, component: ExtractPathways,
    stateModel: ExtractPathwaysState,
  },
  { id: "investigate-pathways", title: INVESTIGATE_PATHWAYS_TITLE, component: InvestigatePathways },
  { id: "prediction-chain", title: PREDICTION_CHAIN_TITLE, component: PredictionChain },
  { id: "correlations", title: CORRELATIONS_TITLE, component: Correlations },
  {
    id: "investigate-unknown-pathway", title: INVESTIGATE_UNKNOWN_PATHWAY_TITLE,
    component: InvestigateUnknownPathway,
  },
  { id: "correlations-part-2", title: CORRELATIONS_PART_2_TITLE, component: CorrelationsPart2 },
];

export function findView(id: string): ViewDef | undefined {
  return VIEWS.find(view => view.id === id);
}
