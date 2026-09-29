import React, { useEffect, useState } from "react";
import { VIEWS } from "../views";
import { getHashViewId } from "../url-state";
import { ViewContent } from "./view-content";
import { ViewNav } from "./view-nav";
import "./standalone-layout.scss";

// An absent or empty view key selects the first view, so a bare index.html starts the lesson.
function selectedIdFromHash(): string {
  return getHashViewId(window.location.hash) || VIEWS[0].id;
}

export const StandaloneLayout: React.FC = () => {
  const [viewId, setViewId] = useState(selectedIdFromHash);

  useEffect(() => {
    const handleHashChange = () => setViewId(selectedIdFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="standalone-layout">
      <ViewNav selectedId={viewId} />
      <main className="standalone-view view-frame">
        <ViewContent viewId={viewId} />
      </main>
    </div>
  );
};
