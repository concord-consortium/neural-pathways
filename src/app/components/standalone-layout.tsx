import React, { useEffect, useState } from "react";
import { VIEWS } from "../views";
import { getHashViewId } from "../url-state";
import { ViewContent } from "./view-content";
import { AppState } from "../state/app-state";
import { ViewNav } from "./view-nav";
import "./standalone-layout.scss";

// An absent or empty view key selects the first view, so a bare index.html starts the lesson.
function selectedIdFromHash(): string {
  return getHashViewId(window.location.hash) || VIEWS[0].id;
}

interface StandaloneLayoutProps {
  appState: AppState;
}

export const StandaloneLayout: React.FC<StandaloneLayoutProps> = ({ appState }) => {
  const [viewId, setViewId] = useState(selectedIdFromHash);

  useEffect(() => {
    const handleHashChange = () => setViewId(selectedIdFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="standalone-layout">
      <ViewNav selectedId={viewId} />
      <main className="standalone-view">
        <ViewContent viewId={viewId} appState={appState} />
      </main>
    </div>
  );
};
