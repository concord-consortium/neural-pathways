import { getGlobalConfig, getRootStore, Model, model, ModelAutoTypeCheckingMode, tProp, types } from "mobx-keystone";
import { AppState } from "./app-state";
import { VIEWS } from "../views";
import { SharedState } from "../../core/state/shared-state";

// Test-only model: the real view models arrive with their view stories.
@model("test/AppStateCounter")
class Counter extends Model({ count: tProp(types.number, 0) }) {}

// A registry with two views sharing one model, like Correlations and Correlations Part 2, and a
// view that keeps no state.
const testViews: Record<string, { stateModel?: typeof Counter }> = {
  "first": { stateModel: Counter },
  "second": { stateModel: Counter },
  "stateless": {},
};
const lookupTestView = (viewId: string) => testViews[viewId];

describe("AppState", () => {
  it("turns on type checking in every environment, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("creates the shared state as a root store", () => {
    const appState = new AppState();
    expect(appState.shared).toBeInstanceOf(SharedState);
    expect(getRootStore(appState.shared)).toBe(appState.shared);
  });

  it("creates a view's state from its registry model on first use, as a root store", () => {
    const state = new AppState(lookupTestView).getViewState("first");
    expect(state).toBeInstanceOf(Counter);
    expect(getRootStore(state!)).toBe(state);
  });

  it("returns the same state on later calls, so switching views keeps it", () => {
    const appState = new AppState(lookupTestView);
    const first = appState.getViewState("first");
    expect(appState.getViewState("first")).toBe(first);
  });

  it("gives two views that share a model separate states", () => {
    const appState = new AppState(lookupTestView);
    const first = appState.getViewState("first");
    const second = appState.getViewState("second");
    expect(second).toBeInstanceOf(Counter);
    expect(second).not.toBe(first);
  });

  it("gives no view state to a view without a state model", () => {
    expect(new AppState(lookupTestView).getViewState("stateless")).toBeUndefined();
  });

  it("gives every view the same shared state", () => {
    const appState = new AppState(lookupTestView);
    const shared = appState.shared;
    appState.getViewState("first");
    appState.getViewState("stateless");
    expect(appState.shared).toBe(shared);
  });

  it("resolves every registered view to a state of its model, or to none", () => {
    const appState = new AppState();
    const matches = VIEWS.map(view => {
      const state = appState.getViewState(view.id);
      return view.stateModel ? state instanceof view.stateModel : state === undefined;
    });
    expect(matches).toEqual(VIEWS.map(() => true));
  });

  it("throws for an unknown view id", () => {
    expect(() => new AppState().getViewState("nope")).toThrow(`Unknown view "nope"`);
  });
});
