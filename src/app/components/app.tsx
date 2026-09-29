import React from "react";
import { getInteractiveViewId } from "../url-state";
import { StandaloneLayout } from "./standalone-layout";
import { ViewContent } from "./view-content";
import "./app.scss";

// In interactive mode the AP author fixed the view, so the hash is ignored. See src/app/README.md.
export const App: React.FC = () => {
  const interactiveViewId = getInteractiveViewId(window.location.search);
  if (interactiveViewId === null) {
    return <StandaloneLayout />;
  }
  return (
    <main className="interactive-view view-frame">
      <ViewContent viewId={interactiveViewId} />
    </main>
  );
};
