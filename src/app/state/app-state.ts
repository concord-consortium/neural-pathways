import { AnyModel, ModelAutoTypeCheckingMode, registerRootStore, setGlobalConfig } from "mobx-keystone";
import { SharedState } from "../../core/state/shared-state";
import { findView, ViewDef } from "../views";

// Check every load and write against the models' types in production too, not only in
// development. The trees are small, so the cost is negligible, and a bad value then throws where
// it is written instead of being saved into a student's state. See docs/view-state.md.
setGlobalConfig({ modelAutoTypeChecking: ModelAutoTypeCheckingMode.AlwaysOn });

type ViewLookup = (viewId: string) => Pick<ViewDef, "stateModel"> | undefined;

/**
 * The student app's state: the shared tree plus one tree per view, each its own root. Held for
 * the life of the page, so switching views in the standalone app keeps each view's state. It is
 * never saved as a whole: in the Activity Player each interactive will save its view tree and the
 * shared tree. See docs/view-state.md.
 */
export class AppState {
  readonly shared = new SharedState({});
  private readonly viewStates = new Map<string, AnyModel>();

  /** `lookupView` defaults to the view registry; tests pass their own. */
  constructor(private readonly lookupView: ViewLookup = findView) {
    registerRootStore(this.shared);
  }

  /**
   * A view's state, created from its model's defaults on first use. Undefined for a view that
   * keeps no state of its own.
   */
  getViewState(viewId: string): AnyModel | undefined {
    const existing = this.viewStates.get(viewId);
    if (existing) {
      return existing;
    }
    const view = this.lookupView(viewId);
    if (!view) {
      throw new Error(`Unknown view "${viewId}"`);
    }
    if (!view.stateModel) {
      return undefined;
    }
    const state = new view.stateModel({});
    registerRootStore(state);
    this.viewStates.set(viewId, state);
    return state;
  }
}
