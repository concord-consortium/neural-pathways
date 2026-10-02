import React from "react";
import { render, screen } from "@testing-library/react";
import { SharedState } from "./shared-state";
import { TraceACaseState } from "./trace-a-case-state";
import { CorrelationsState } from "./correlations-state";
import { useSharedState, useViewState, ViewStateProvider } from "./view-state-context";

const Probe: React.FC = () => {
  const view = useViewState(TraceACaseState);
  const shared = useSharedState();
  return <p>{`speed ${view.speed}, query ${shared.query}`}</p>;
};

const WrongModelProbe: React.FC = () => {
  useViewState(CorrelationsState);
  return null;
};

describe("ViewStateProvider", () => {
  it("gives a view its own state and the shared state", () => {
    const view = new TraceACaseState({ speed: 2 });
    const shared = new SharedState({ query: "model_correct:0" });
    render(
      <ViewStateProvider viewId="trace-a-case" view={view} shared={shared}>
        <Probe />
      </ViewStateProvider>
    );
    expect(screen.getByText("speed 2, query model_correct:0")).toBeInTheDocument();
  });

  it("throws when a view asks for a different model than it was given", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(
      <ViewStateProvider viewId="trace-a-case" view={new TraceACaseState({})} shared={new SharedState({})}>
        <WrongModelProbe />
      </ViewStateProvider>
    )).toThrow(`View "trace-a-case" has npw/TraceACaseState state, not CorrelationsState`);
    spy.mockRestore();
  });

  it("throws when used outside a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow("useViewState must be used inside a ViewStateProvider");
    spy.mockRestore();
  });
});
