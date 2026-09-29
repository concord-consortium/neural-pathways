import React, { useEffect, useRef, useState } from "react";
import { findView, VIEWS } from "../views";
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
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleHashChange = () => setViewId(selectedIdFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Each view starts at the top. Focus stays where the student put it, usually on the nav link,
  // so they can keep stepping through the views; the status region announces the change.
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [viewId]);

  return (
    <div className="standalone-layout">
      <ViewNav selectedId={viewId} />
      <main className="standalone-view view-frame" ref={mainRef}>
        <ViewContent viewId={viewId} appState={appState} />
      </main>
      <p className="visually-hidden" role="status">{findView(viewId)?.title ?? "Unknown view"}</p>
    </div>
  );
};
