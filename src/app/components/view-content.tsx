import React, { useEffect } from "react";
import { ViewStateProvider } from "../../core/state/view-state-context";
import { AppState } from "../state/app-state";
import { findView, VIEWS } from "../views";
import "./view-content.scss";

export const APP_TITLE = "Neural Pathways";

interface ViewContentProps {
  viewId: string;
  appState: AppState;
}

export const ViewContent: React.FC<ViewContentProps> = ({ viewId, appState }) => {
  const view = findView(viewId);

  // A per-view page title helps history, tab lists and screen readers tell views apart.
  useEffect(() => {
    document.title = view ? `${view.title} – ${APP_TITLE}` : APP_TITLE;
  }, [view]);

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
  // Keyed by view id so React state never carries over between views, even two that share a
  // component, the way Correlations Part 2 could share Correlations'.
  return (
    <ViewStateProvider key={view.id} viewId={view.id} view={appState.getViewState(view.id)} shared={appState.shared}>
      <ViewComponent />
    </ViewStateProvider>
  );
};
