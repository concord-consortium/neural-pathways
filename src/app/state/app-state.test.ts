import {
  fromSnapshot, getGlobalConfig, getRootStore, ModelAutoTypeCheckingMode, onPatches, Patch, runUnprotected,
  undoMiddleware,
} from "mobx-keystone";
import { AppState } from "./app-state";
import { VIEWS } from "../views";
import { SharedState } from "../../core/state/shared-state";
import { TraceACaseState } from "../../core/state/trace-a-case-state";
import { CorrelationsState } from "../../core/state/correlations-state";
import { InvestigateUnknownPathwayState } from "../../core/state/investigate-unknown-pathway-state";
import { savedJson } from "../../core/state/test-helpers";
import traceFixture from "../../core/state/__fixtures__/trace-a-case-state.v1.json";
import correlationsFixture from "../../core/state/__fixtures__/correlations-state.v1.json";
import sharedFixture from "../../core/state/__fixtures__/shared-state.v1.json";

describe("AppState", () => {
  it("turns on type checking in every environment, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("holds the shared state and every view's state under one root store", () => {
    const appState = new AppState();
    expect(appState.shared).toBeInstanceOf(SharedState);
    expect(getRootStore(appState.shared)).toBe(appState.root);
    for (const view of VIEWS) {
      expect(getRootStore(appState.getViewState(view.id))).toBe(appState.root);
    }
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

  it("undoes a change to a view and the shared state as one step", () => {
    const appState = new AppState();
    const iup = appState.getViewState("investigate-unknown-pathway") as InvestigateUnknownPathwayState;
    const undoManager = undoMiddleware(appState.root);
    // Commissioning a coding and selecting its chip, as one student action
    undoManager.withGroup(() => {
      appState.shared.commission("age");
      iup.toggleAttribute(1, "age");
    });
    expect(undoManager.undoLevels).toBe(1);
    undoManager.undo();
    expect(appState.shared.commissioned).toEqual([]);
    expect(iup.pane1.selectedAttributes).toEqual([]);
  });

  it("saves a view's tree and the shared tree in their saved forms", () => {
    const appState = new AppState();
    expect(savedJson(appState.getViewState("trace-a-case"))).toEqual(savedJson(new TraceACaseState({})));
    expect(savedJson(appState.shared)).toEqual(savedJson(new SharedState({})));
  });

  it("reports each change with a path that names its tree", () => {
    const appState = new AppState();
    const paths: Patch["path"][] = [];
    onPatches(appState.root, patches => paths.push(...patches.map(patch => patch.path)));
    (appState.getViewState("trace-a-case") as TraceACaseState).setSpeed(0);
    appState.shared.setQuery("x");
    expect(paths).toEqual([["views", "trace-a-case", "speed"], ["shared", "query"]]);
  });

  it("accepts saved trees loaded into their slots", () => {
    const appState = new AppState();
    const loaded = fromSnapshot(TraceACaseState, traceFixture as any);
    runUnprotected(() => {
      appState.root.views["trace-a-case"] = loaded;
      appState.root.shared = fromSnapshot(SharedState, sharedFixture as any);
    });
    expect(appState.getViewState("trace-a-case")).toBe(loaded);
    expect(getRootStore(loaded)).toBe(appState.root);
    expect(savedJson(appState.shared)).toEqual(sharedFixture);
  });

  it("rejects another view's saved tree in a view's slot", () => {
    const appState = new AppState();
    // fromSnapshot goes by the snapshot's $modelType, so this returns a CorrelationsState
    const wrong = fromSnapshot(TraceACaseState, correlationsFixture as any);
    expect(wrong).toBeInstanceOf(CorrelationsState);
    expect(() => runUnprotected(() => {
      appState.root.views["trace-a-case"] = wrong;
    })).toThrow();
  });
});
