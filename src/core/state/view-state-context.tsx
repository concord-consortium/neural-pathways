import React, { createContext, useContext, useMemo } from "react";
import { _getGlobalState } from "mobx";
import type { AnyModel } from "mobx-keystone";
import type { SharedState } from "./shared-state";

interface ViewStateContextValue {
  viewId: string;
  /** Undefined for a view that keeps no state of its own. */
  view: AnyModel | undefined;
  shared: SharedState;
}

const ViewStateContext = createContext<ViewStateContextValue | undefined>(undefined);

interface ViewStateProviderProps extends ViewStateContextValue {
  children: React.ReactNode;
}

/** Supplied by the app around each view, so views can reach their state importing only `core`. */
export const ViewStateProvider: React.FC<ViewStateProviderProps> = ({ viewId, view, shared, children }) => {
  const value = useMemo(() => ({ viewId, view, shared }), [viewId, view, shared]);
  return <ViewStateContext.Provider value={value}>{children}</ViewStateContext.Provider>;
};

// Views warned about reading state outside `observer`, so each view warns only once.
const warnedNotObserver = new WeakSet<ViewStateContextValue>();

function useViewStateContext(hookName: string): ViewStateContextValue {
  const value = useContext(ViewStateContext);
  if (!value) {
    throw new Error(`${hookName} must be used inside a ViewStateProvider`);
  }
  // MobX sets a tracking derivation while an `observer` component renders.
  if (process.env.NODE_ENV !== "production" && !_getGlobalState().trackingDerivation &&
      !warnedNotObserver.has(value)) {
    warnedNotObserver.add(value);
    console.warn(
      `${hookName} was called outside an observer component in view "${value.viewId}", so the view ` +
      "won't re-render when the state changes. Wrap the component in observer from mobx-react-lite."
    );
  }
  return value;
}

export function useSharedState(): SharedState {
  return useViewStateContext("useSharedState").shared;
}

/** This view's own state, checked against the model class the view expects. */
export function useViewState<M extends AnyModel>(modelClass: abstract new (...args: any[]) => M): M {
  const { viewId, view } = useViewStateContext("useViewState");
  if (!view) {
    throw new Error(`View "${viewId}" has no state model; set stateModel in its VIEWS entry`);
  }
  if (!(view instanceof modelClass)) {
    throw new Error(`View "${viewId}" has ${view.$modelType} state, not ${modelClass.name}`);
  }
  return view;
}
