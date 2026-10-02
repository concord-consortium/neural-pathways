import {
  AnyModel, Model, model, ModelAutoTypeCheckingMode, registerRootStore, setGlobalConfig, tProp, types,
} from "mobx-keystone";
import { SharedState } from "../../core/state/shared-state";
import { VIEWS, ViewDef } from "../views";

// Check every load and write against the models' types in production too, not only in
// development. The trees are small, so the cost is negligible, and a bad value then throws where
// it is written instead of being saved into a student's state. See docs/view-state.md.
setGlobalConfig({ modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOn });

type ViewWithState = Pick<ViewDef, "id" | "stateModel">;

/**
 * The root model for a list of views: the shared tree, plus one tree per view. `views` has one
 * typed prop per view id, built from the list, so each id can only hold a tree of its own view's
 * model. The root is never saved, so its `$modelType` isn't stored.
 */
function createAppStateModel(name: string, views: readonly ViewWithState[]) {
  @model(name)
  class AppStateModel extends Model({
    shared: tProp(types.model(SharedState), () => new SharedState({})),
    views: tProp(
      types.object(() => Object.fromEntries(views.map(view => [view.id, types.model(view.stateModel)]))),
      () => Object.fromEntries(views.map(view => [view.id, new view.stateModel({})]))
    ),
  }) {}
  return AppStateModel;
}

type AppStateModel = InstanceType<ReturnType<typeof createAppStateModel>>;

// One root model class per list of views: the registry's, and any that tests pass in.
const appStateModels = new Map<readonly ViewWithState[], ReturnType<typeof createAppStateModel>>();
function appStateModelFor(views: readonly ViewWithState[]) {
  let modelClass = appStateModels.get(views);
  if (!modelClass) {
    modelClass = createAppStateModel(views === VIEWS ? "npw/AppState" : `npw/AppState#${appStateModels.size}`, views);
    appStateModels.set(views, modelClass);
  }
  return modelClass;
}

/**
 * The student app's state: the shared tree and every view's tree, as children of one root, so a
 * student action that changes a view and the shared state can be one undo step. Held for the
 * life of the page, so switching views in the standalone app keeps each view's state. The root
 * is never saved as a whole: in the Activity Player each interactive will save its view tree and
 * the shared tree. See docs/view-state.md.
 */
export class AppState {
  readonly root: AppStateModel;

  /** `views` defaults to the view registry; tests pass their own. */
  constructor(private readonly views: readonly ViewWithState[] = VIEWS) {
    const AppStateModelClass = appStateModelFor(views);
    this.root = new AppStateModelClass({});
    registerRootStore(this.root);
  }

  get shared(): SharedState {
    return this.root.shared;
  }

  /** A view's state. */
  getViewState(viewId: string): AnyModel {
    if (!this.views.some(view => view.id === viewId)) {
      throw new Error(`Unknown view "${viewId}"`);
    }
    return this.root.views[viewId];
  }
}
