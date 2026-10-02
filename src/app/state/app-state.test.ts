import { getRootStore, Model, model, modelAction, runUnprotected, tProp, types, undoMiddleware } from "mobx-keystone";
import { AppState } from "./app-state";
import { VIEWS } from "../views";
import { SharedState } from "../../core/state/shared-state";

// Test-only models: the real view models arrive with their view stories.
@model("test/AppStateCounter")
class Counter extends Model({ count: tProp(types.number, 0) }) {
  @modelAction
  increment() {
    this.count++;
  }
}

@model("test/AppStateOther")
class Other extends Model({}) {}

// A registry with two views sharing one model, like Correlations and Correlations Part 2, and a
// view that keeps no state.
const testViews = [
  { id: "first", stateModel: Counter },
  { id: "second", stateModel: Counter },
  { id: "stateless" },
];

describe("AppState", () => {
  it("holds the shared state and every view's state under one root store", () => {
    const appState = new AppState(testViews);
    expect(appState.shared).toBeInstanceOf(SharedState);
    expect(getRootStore(appState.shared)).toBe(appState.root);
    expect(getRootStore(appState.getViewState("first")!)).toBe(appState.root);
  });

  it("creates each view's state from its registry model", () => {
    expect(new AppState(testViews).getViewState("first")).toBeInstanceOf(Counter);
  });

  it("returns the same state on later calls, so switching views keeps it", () => {
    const appState = new AppState(testViews);
    const first = appState.getViewState("first");
    expect(appState.getViewState("first")).toBe(first);
  });

  it("gives two views that share a model separate states", () => {
    const appState = new AppState(testViews);
    const first = appState.getViewState("first");
    const second = appState.getViewState("second");
    expect(second).toBeInstanceOf(Counter);
    expect(second).not.toBe(first);
  });

  it("gives no view state to a view without a state model", () => {
    expect(new AppState(testViews).getViewState("stateless")).toBeUndefined();
  });

  it("only lets a view's slot hold its own model", () => {
    const appState = new AppState(testViews);
    expect(() => runUnprotected(() => {
      appState.root.views.first = new Other({});
    })).toThrow();
  });

  it("lets one undo manager on the root record a change in any view", () => {
    const appState = new AppState(testViews);
    const undoManager = undoMiddleware(appState.root);
    (appState.getViewState("second") as Counter).increment();
    expect(undoManager.undoLevels).toBe(1);
    undoManager.undo();
    expect((appState.getViewState("second") as Counter).count).toBe(0);
  });

  it("resolves every registered view to a state of its model, or to none", () => {
    const appState = new AppState();
    const matches = VIEWS.map(view => {
      const state = appState.getViewState(view.id);
      return [view.id, view.stateModel ? state instanceof view.stateModel : state === undefined];
    });
    expect(matches).toEqual(VIEWS.map(view => [view.id, true]));
  });

  it("throws for an unknown view id", () => {
    expect(() => new AppState().getViewState("nope")).toThrow(`Unknown view "nope"`);
  });
});
