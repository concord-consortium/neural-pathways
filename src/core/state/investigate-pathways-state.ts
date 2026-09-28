import { Model, model, modelAction, tProp, types } from "mobx-keystone";

/** A pathway or a neuron whose loadings are shown. Both are numbered by the fixed network, not a list. */
export interface LoadingSelection {
  kind: "pathway" | "neuron";
  index: number;
}

const loadingSelectionType = types.object(() => ({
  kind: types.or(types.literal("pathway"), types.literal("neuron")),
  index: types.integer,
}));

/**
 * Investigate Pathways' own state. The query and the current conversation are in SharedState.
 * The `$modelType` is stored in saved student data: never rename it.
 */
@model("npw/InvestigatePathwaysState")
export class InvestigatePathwaysState extends Model({
  version: tProp(types.literal(1), 1),
  loadingSelection: tProp(types.maybe(loadingSelectionType)),
}) {
  @modelAction
  setLoadingSelection(selection: LoadingSelection | undefined) {
    this.loadingSelection = selection;
  }
}
