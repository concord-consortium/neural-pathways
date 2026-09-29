import React from "react";
import { act, render, screen } from "@testing-library/react";
import { Model, model, modelAction, tProp, types } from "mobx-keystone";
import { observer } from "mobx-react-lite";
import { SharedState } from "./shared-state";
import { useSharedState, useViewState, ViewStateProvider } from "./view-state-context";

// Test-only models: the real view models arrive with their view stories.
@model("test/CounterState")
class CounterState extends Model({ count: tProp(types.number, 0) }) {
  @modelAction
  increment() {
    this.count++;
  }
}

@model("test/OtherState")
class OtherState extends Model({}) {}

const Probe: React.FC = () => {
  const view = useViewState(CounterState);
  const shared = useSharedState();
  return <p>{`count ${view.count}, shared version ${shared.version}`}</p>;
};

// Views that read state are wrapped in `observer`; without it a model action doesn't re-render them.
const ObserverProbe = observer(() => <p>{`count ${useViewState(CounterState).count}`}</p>);

const SharedOnlyProbe: React.FC = () => <p>{`shared version ${useSharedState().version}`}</p>;

const WrongModelProbe: React.FC = () => {
  useViewState(OtherState);
  return null;
};

function muteConsoleErrors() {
  // React reports the thrown render error to console.error, which is expected in these tests.
  return jest.spyOn(console, "error").mockImplementation(() => undefined);
}

describe("ViewStateProvider", () => {
  it("gives a view its own state and the shared state", () => {
    render(
      <ViewStateProvider viewId="counter" view={new CounterState({ count: 2 })} shared={new SharedState({})}>
        <Probe />
      </ViewStateProvider>
    );
    expect(screen.getByText("count 2, shared version 1")).toBeInTheDocument();
  });

  it("re-renders an observer view when its state changes", () => {
    const state = new CounterState({});
    render(
      <ViewStateProvider viewId="counter" view={state} shared={new SharedState({})}>
        <ObserverProbe />
      </ViewStateProvider>
    );
    act(() => state.increment());
    expect(screen.getByText("count 1")).toBeInTheDocument();
  });

  it("gives the shared state to a view that has no state model", () => {
    render(
      <ViewStateProvider viewId="placeholder" view={undefined} shared={new SharedState({})}>
        <SharedOnlyProbe />
      </ViewStateProvider>
    );
    expect(screen.getByText("shared version 1")).toBeInTheDocument();
  });

  it("throws when a view with no state model asks for one", () => {
    const spy = muteConsoleErrors();
    expect(() => render(
      <ViewStateProvider viewId="placeholder" view={undefined} shared={new SharedState({})}>
        <Probe />
      </ViewStateProvider>
    )).toThrow(`View "placeholder" has no state model; set stateModel in its VIEWS entry`);
    spy.mockRestore();
  });

  it("throws when a view asks for a different model than it was given", () => {
    const spy = muteConsoleErrors();
    expect(() => render(
      <ViewStateProvider viewId="counter" view={new CounterState({})} shared={new SharedState({})}>
        <WrongModelProbe />
      </ViewStateProvider>
    )).toThrow(`View "counter" has test/CounterState state, not OtherState`);
    spy.mockRestore();
  });

  it("throws when used outside a provider", () => {
    const spy = muteConsoleErrors();
    expect(() => render(<Probe />)).toThrow("useViewState must be used inside a ViewStateProvider");
    spy.mockRestore();
  });
});
