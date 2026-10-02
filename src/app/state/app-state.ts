import "../../core/state/setup";
import { AnyModel, Model, model, registerRootStore, tProp, types } from "mobx-keystone";
import { SharedState } from "../../core/state/shared-state";
import { VIEWS, ViewDef } from "../views";

type ViewWithState = Pick<ViewDef, "id" | "stateModel">;

/**
 * The root model for a list of views: the shared tree, plus one tree per view that has a state
 * model. `views` has one typed prop per view id, built from the list, so each id can only hold a
 * tree of its own view's model. The root is never saved, so its `$modelType` isn't stored.
 */
function createAppStateModel(name: string, views: readonly ViewWithState[]) {
  const stateful = views.flatMap(view => view.stateModel ? [{ id: view.id, stateModel: view.stateModel }] : []);
  @model(name)
  class AppStateModel extends Model({
    shared: tProp(types.model(SharedState), () => new SharedState({})),
    views: tProp(
      types.object(() => Object.fromEntries(stateful.map(view => [view.id, types.model(view.stateModel)]))),
      () => Object.fromEntries(stateful.map(view => [view.id, new view.stateModel({})]))
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
 * student action that changes a view and the shared state can later be one undo step. Held for
 * the life of the page, so switching views in the standalone app keeps each view's state. The
 * root is never saved as a whole. See docs/view-state.md.
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

  /** A view's state. Undefined for a view that keeps no state of its own. */
  getViewState(viewId: string): AnyModel | undefined {
    if (!this.views.some(view => view.id === viewId)) {
      throw new Error(`Unknown view "${viewId}"`);
    }
    return this.root.views[viewId];
  }
}
