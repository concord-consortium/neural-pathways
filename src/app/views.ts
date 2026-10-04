import React from "react";
import type { AnyModel, ModelClass } from "mobx-keystone";
import { TraceACase } from "../views/trace-a-case/trace-a-case";
import { ExtractPathways } from "../views/extract-pathways/extract-pathways";
import { InvestigatePathways } from "../views/investigate-pathways/investigate-pathways";
import { PredictionChain } from "../views/prediction-chain/prediction-chain";
import { Correlations } from "../views/correlations/correlations";
import { InvestigateUnknownPathway } from "../views/investigate-unknown-pathway/investigate-unknown-pathway";
import { CorrelationsPart2 } from "../views/correlations-part-2/correlations-part-2";
import { CorrelationsState } from "../core/state/correlations-state";
import { TraceACaseState } from "../views/trace-a-case/trace-a-case-state";
import { ExtractPathwaysState } from "../views/extract-pathways/extract-pathways-state";
import { InvestigatePathwaysState } from "../views/investigate-pathways/investigate-pathways-state";
import { PredictionChainState } from "../views/prediction-chain/prediction-chain-state";
import { InvestigateUnknownPathwayState } from "../views/investigate-unknown-pathway/investigate-unknown-pathway-state";

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
  { id: "trace-a-case", title: "Trace a Case", component: TraceACase, stateModel: TraceACaseState },
  {
    id: "extract-pathways", title: "Extract Pathways", component: ExtractPathways,
    stateModel: ExtractPathwaysState,
  },
  {
    id: "investigate-pathways", title: "Investigate Pathways", component: InvestigatePathways,
    stateModel: InvestigatePathwaysState,
  },
  {
    id: "prediction-chain", title: "Prediction Chain", component: PredictionChain,
    stateModel: PredictionChainState,
  },
  { id: "correlations", title: "Correlations", component: Correlations, stateModel: CorrelationsState },
  {
    id: "investigate-unknown-pathway", title: "Investigate Unknown Pathway",
    component: InvestigateUnknownPathway, stateModel: InvestigateUnknownPathwayState,
  },
  {
    id: "correlations-part-2", title: "Correlations Part 2", component: CorrelationsPart2,
    stateModel: CorrelationsState,
  },
];

export function findView(id: string): ViewDef | undefined {
  return VIEWS.find(view => view.id === id);
}
