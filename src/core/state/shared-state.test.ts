import {
  fromSnapshot, getGlobalConfig, getSnapshot, Model, model, ModelAutoTypeCheckingMode, SnapshotTypeMismatchError,
} from "mobx-keystone";
import { SharedState } from "./shared-state";
import { savedJson } from "./test-helpers";
import fixture from "./__fixtures__/shared-state.v1.json";

// Test-only: another registered model whose saved form must not load as SharedState.
@model("test/NotSharedState")
class NotSharedState extends Model({}) {}

describe("SharedState", () => {
  it("turns on type checking in every environment when it is imported, production included", () => {
    expect(getGlobalConfig().modelAutoTypeChecking).toBe(ModelAutoTypeCheckingMode.AlwaysOn);
  });

  it("starts at version 1", () => {
    expect(savedJson(new SharedState({}))).toEqual({ version: 1, $modelType: "npw/SharedState" });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(SharedState, fixture as any))).toEqual(fixture);
  });

  it("loads a saved form without $modelType", () => {
    expect(savedJson(fromSnapshot(SharedState, { version: 1 } as any))).toEqual(fixture);
  });

  it("rejects a saved form from another version", () => {
    expect(() => fromSnapshot(SharedState, { ...fixture, version: 2 } as any)).toThrow();
  });

  // Before mobx-keystone 2.3.0 this returned a NotSharedState (mobx-keystone #590).
  it("rejects the saved form of a different model", () => {
    const other = getSnapshot(new NotSharedState({}));
    expect(() => fromSnapshot(SharedState, other as any)).toThrow(SnapshotTypeMismatchError);
  });
});
