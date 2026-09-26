import React from "react";
import { getEmbedViewId } from "../url-state";
import { StandaloneLayout } from "./standalone-layout";
import { ViewContent } from "./view-content";

/**
 * `?interactive=<id>` is embed mode: the AP author fixed the view, so it is shown alone and the
 * hash is ignored. Without that param the page is the standalone app with its view nav.
 */
export const App: React.FC = () => {
  const embedViewId = getEmbedViewId(window.location.search);
  if (embedViewId === null) {
    return <StandaloneLayout />;
  }
  return (
    <main className="embed-view">
      <ViewContent viewId={embedViewId} />
    </main>
  );
};
