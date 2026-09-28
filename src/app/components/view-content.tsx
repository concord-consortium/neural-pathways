import React from "react";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { AppState } from "../state/app-state";
import { findView, VIEWS } from "../views";
import "./view-content.scss";

interface ViewContentProps {
  viewId: string;
  appState: AppState;
}

export const ViewContent: React.FC<ViewContentProps> = ({ viewId, appState }) => {
  const view = findView(viewId);
  if (!view) {
    return (
      <div className="unknown-view">
        <p>Unknown view &quot;{viewId}&quot;. The valid view ids are:</p>
        <ul>
          {VIEWS.map(v => <li key={v.id}><code>{v.id}</code></li>)}
        </ul>
      </div>
    );
  }
  const ViewComponent = view.component;
  return (
    <ViewStateProvider viewId={view.id} view={appState.getViewState(view.id)} shared={appState.shared}>
      <ViewComponent />
    </ViewStateProvider>
  );
};
