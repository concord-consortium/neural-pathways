import { fromSnapshot } from "mobx-keystone";
import { CorrelationsState } from "./correlations-state";
import { savedJson } from "./test-helpers";
import correlationsFixture from "./__fixtures__/correlations-state.v1.json";

describe("CorrelationsState", () => {
  it("starts on Measures with no detail card open", () => {
    expect(savedJson(new CorrelationsState({}))).toEqual({
      version: 1, mode: "measures", $modelType: "npw/CorrelationsState",
    });
  });

  it("loads its version 1 saved form and saves it back unchanged", () => {
    expect(savedJson(fromSnapshot(CorrelationsState, correlationsFixture as any))).toEqual(correlationsFixture);
  });

  it("rejects an unknown mode", () => {
    expect(() => fromSnapshot(CorrelationsState, { ...correlationsFixture, mode: "table" } as any)).toThrow();
  });

  it("switches mode", () => {
    const state = new CorrelationsState({});
    state.setMode("graphs");
    expect(state.mode).toBe("graphs");
  });

  it("opens a cell or pathway detail card by attribute key and pathway number, and closes it", () => {
    const state = new CorrelationsState({});
    state.openDetailCard({ kind: "cell", attribute: "young_present", pathway: 1 });
    expect(state.openDetail).toEqual({ kind: "cell", attribute: "young_present", pathway: 1 });
    state.openDetailCard({ kind: "pathway", pathway: 3 });
    expect(state.openDetail).toEqual({ kind: "pathway", pathway: 3 });
    state.closeDetailCard();
    expect(state.openDetail).toBeUndefined();
  });
});
