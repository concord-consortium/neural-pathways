import React, { createContext, useContext, useMemo } from "react";
import type { AnyModel } from "mobx-keystone";
import type { SharedState } from "./shared-state";

interface ViewStateContextValue {
  viewId: string;
  view: AnyModel;
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

function useViewStateContext(hookName: string): ViewStateContextValue {
  const value = useContext(ViewStateContext);
  if (!value) {
    throw new Error(`${hookName} must be used inside a ViewStateProvider`);
  }
  return value;
}

export function useSharedState(): SharedState {
  return useViewStateContext("useSharedState").shared;
}

/** This view's own state, checked against the model class the view expects. */
export function useViewState<M extends AnyModel>(modelClass: abstract new (...args: any[]) => M): M {
  const { viewId, view } = useViewStateContext("useViewState");
  if (!(view instanceof modelClass)) {
    throw new Error(`View "${viewId}" has ${view.$modelType} state, not ${modelClass.name}`);
  }
  return view;
}
