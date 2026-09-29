import React from "react";
import { getInteractiveViewId } from "../url-state";
import { StandaloneLayout } from "./standalone-layout";
import { ViewContent } from "./view-content";

/**
 * `?interactive=<id>` is interactive mode: the AP author fixed the view, so it is shown alone and the
 * hash is ignored. Without that param the page is the standalone app with its view nav.
 */
export const App: React.FC = () => {
  const interactiveViewId = getInteractiveViewId(window.location.search);
  if (interactiveViewId === null) {
    return <StandaloneLayout />;
  }
  return (
    <main className="interactive-view">
      <ViewContent viewId={interactiveViewId} />
    </main>
  );
};
