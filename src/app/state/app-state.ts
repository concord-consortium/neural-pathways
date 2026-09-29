import { AnyModel, ModelAutoTypeCheckingMode, registerRootStore, setGlobalConfig } from "mobx-keystone";
import { SharedState } from "../../core/state/shared-state";
import { findView } from "../views";

// Check every load and write against the models' types in production too, not only in
// development. The trees are small, so the cost is negligible, and a bad value then throws where
// it is written instead of being saved into a student's state. See docs/view-state.md.
setGlobalConfig({ modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOn });

/**
 * The student app's state: the shared tree plus one tree per view, each its own root. Held for
 * the life of the page, so switching views in the standalone app keeps each view's state. It is
 * never saved as a whole: in the Activity Player each interactive saves its view tree and the
 * shared tree (NPW-43). See docs/view-state.md.
 */
export class AppState {
  readonly shared = new SharedState({});
  private readonly viewStates = new Map<string, AnyModel>();

  constructor() {
    registerRootStore(this.shared);
  }

  /** A view's state, created from its model's defaults on first use. */
  getViewState(viewId: string): AnyModel {
    let state = this.viewStates.get(viewId);
    if (!state) {
      const view = findView(viewId);
      if (!view) {
        throw new Error(`Unknown view "${viewId}"`);
      }
      state = new view.stateModel({});
      registerRootStore(state);
      this.viewStates.set(viewId, state);
    }
    return state;
  }
}
