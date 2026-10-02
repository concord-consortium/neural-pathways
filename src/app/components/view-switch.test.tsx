import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./app";
import { AppState } from "../state/app-state";

// A registry with a counting view and a view without state, since no real view has a model yet.
jest.mock("../views", () => {
  const { decoratedModel, Model, modelAction, tProp, types } = require("mobx-keystone");
  const { observer } = require("mobx-react-lite");
  const { useViewState } = require("../../core/state/view-state-context");

  const CounterState = decoratedModel("test/ViewSwitchCounter", class extends Model({
    count: tProp(types.number, 0),
  }) {
    increment() {
      this.count++;
    }
  }, { increment: modelAction });

  const CountingView = observer(() => {
    const state = useViewState(CounterState);
    return <button onClick={() => state.increment()}>{`count ${state.count}`}</button>;
  });
  const OtherView = () => <p>other view</p>;

  const VIEWS = [
    { id: "counting", title: "Counting", component: CountingView, stateModel: CounterState },
    { id: "other", title: "Other", component: OtherView },
  ];
  return { VIEWS, findView: (id: string) => VIEWS.find(view => view.id === id) };
});

function showView(viewId: string) {
  act(() => {
    window.history.replaceState(null, "", `/#view=${viewId}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("switching views in the standalone app", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("keeps a view's state when the student leaves it and comes back", () => {
    window.history.replaceState(null, "", "/#view=counting");
    render(<App appState={new AppState()} />);
    fireEvent.click(screen.getByRole("button", { name: "count 0" }));
    fireEvent.click(screen.getByRole("button", { name: "count 1" }));

    showView("other");
    expect(screen.getByText("other view")).toBeInTheDocument();

    showView("counting");
    expect(screen.getByRole("button", { name: "count 2" })).toBeInTheDocument();
  });
});
