import React, { useState } from "react";
import { getEmbedViewId } from "../url-state";
import { AppState } from "../state/app-state";
import { StandaloneLayout } from "./standalone-layout";
import { ViewContent } from "./view-content";

/**
 * `?interactive=<id>` is embed mode: the AP author fixed the view, so it is shown alone and the
 * hash is ignored. Without that param the page is the standalone app with its view nav. Both modes
 * hold their state in one AppState for the life of the page.
 */
export const App: React.FC = () => {
  const [appState] = useState(() => new AppState());
  const embedViewId = getEmbedViewId(window.location.search);
  if (embedViewId === null) {
    return <StandaloneLayout appState={appState} />;
  }
  return (
    <main className="embed-view">
      <ViewContent viewId={embedViewId} appState={appState} />
    </main>
  );
};
