import "../../core/state/setup";
import { Model, model, modelAction, tProp, types, TypeToData } from "mobx-keystone";

/** What a loading selection can point at. The values are stored in saved student data: never change them. */
export const LOADING_SELECTION_KINDS = ["pathway", "neuron"] as const;

const loadingSelectionType = types.object(() => ({
  kind: types.or(...LOADING_SELECTION_KINDS.map(kind => types.literal(kind))),
  index: types.integer,
}));

/** A pathway or a neuron whose loadings are shown. Both are numbered by the fixed network, not a list. */
export type LoadingSelection = TypeToData<typeof loadingSelectionType>;

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
