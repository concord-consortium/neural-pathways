import React, { useState } from "react";
import { getInteractiveViewId } from "../url-state";
import { AppState } from "../state/app-state";
import { StandaloneLayout } from "./standalone-layout";
import { ViewContent } from "./view-content";
import "./app.scss";

// In interactive mode the AP author fixed the view, so the hash is ignored. Both modes hold their
// state in one AppState for the life of the page. See src/app/README.md.
export const App: React.FC = () => {
  const [appState] = useState(() => new AppState());
  const interactiveViewId = getInteractiveViewId(window.location.search);
  if (interactiveViewId === null) {
    return <StandaloneLayout appState={appState} />;
  }
  return (
    <main className="interactive-view view-frame">
      <ViewContent viewId={interactiveViewId} appState={appState} />
    </main>
  );
};
