import { getGlobalConfig, getRootStore, ModelAutoTypeCheckingMode } from "mobx-keystone";
import { AppState } from "./app-state";
import { VIEWS } from "../views";
import { SharedState } from "../../core/state/shared-state";
import { TraceACaseState } from "../../core/state/trace-a-case-state";
import { CorrelationsState } from "../../core/state/correlations-state";

describe("AppState", () => {
  it("turns on type checking in every environment, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("creates the shared state as a root store", () => {
    const appState = new AppState();
    expect(appState.shared).toBeInstanceOf(SharedState);
    expect(getRootStore(appState.shared)).toBe(appState.shared);
  });

  it("creates a view's state from its registry model on first use", () => {
    const state = new AppState().getViewState("trace-a-case");
    expect(state).toBeInstanceOf(TraceACaseState);
    expect(getRootStore(state)).toBe(state);
  });

  it("returns the same state on later calls, so switching views keeps it", () => {
    const appState = new AppState();
    const first = appState.getViewState("trace-a-case") as TraceACaseState;
    first.setSpeed(2);
    expect(appState.getViewState("trace-a-case")).toBe(first);
    expect((appState.getViewState("trace-a-case") as TraceACaseState).speed).toBe(2);
  });

  it("gives every view the same shared state", () => {
    const appState = new AppState();
    const shared = appState.shared;
    appState.getViewState("trace-a-case");
    appState.getViewState("correlations");
    expect(appState.shared).toBe(shared);
    shared.setQuery("model_correct:0");
    expect(appState.shared.query).toBe("model_correct:0");
  });

  it("keeps Correlations and Correlations Part 2 separate, though they share a model", () => {
    const appState = new AppState();
    const part1 = appState.getViewState("correlations") as CorrelationsState;
    const part2 = appState.getViewState("correlations-part-2") as CorrelationsState;
    expect(part2).toBeInstanceOf(CorrelationsState);
    expect(part2).not.toBe(part1);
    part1.setMode("graphs");
    expect(part2.mode).toBe("measures");
  });

  it("gives every registered view a state of its registry model", () => {
    const appState = new AppState();
    for (const view of VIEWS) {
      expect(appState.getViewState(view.id)).toBeInstanceOf(view.stateModel);
    }
  });

  it("throws for an unknown view id", () => {
    expect(() => new AppState().getViewState("nope")).toThrow(`Unknown view "nope"`);
  });
});
