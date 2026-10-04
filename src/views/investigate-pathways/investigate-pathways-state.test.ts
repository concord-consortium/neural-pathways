import { fromSnapshot } from "mobx-keystone";
import { savedJson } from "../../core/state/test-helpers";
import { InvestigatePathwaysState } from "./investigate-pathways-state";
import investigateFixture from "./__fixtures__/investigate-pathways-state.v1.json";

describe("InvestigatePathwaysState", () => {
  it("starts with nothing selected", () => {
    expect(savedJson(new InvestigatePathwaysState({}))).toEqual({
      version: 1, $modelType: "npw/InvestigatePathwaysState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(InvestigatePathwaysState, investigateFixture as any))).toEqual(investigateFixture);
  });

  it("rejects a selection of an unknown kind", () => {
    expect(() => fromSnapshot(InvestigatePathwaysState, {
      ...investigateFixture, loadingSelection: { kind: "layer", index: 1 },
    } as any)).toThrow();
  });

  it("selects a pathway or a neuron, and clears the selection", () => {
    const state = new InvestigatePathwaysState({});
    state.setLoadingSelection({ kind: "pathway", index: 2 });
    expect(state.loadingSelection).toEqual({ kind: "pathway", index: 2 });
    state.setLoadingSelection(undefined);
    expect(state.loadingSelection).toBeUndefined();
  });
});
