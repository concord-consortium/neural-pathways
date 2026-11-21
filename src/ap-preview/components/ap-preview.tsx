import React, { useEffect, useState } from "react";
import { VIEWS } from "../../app/views";
import { apSize } from "../ap-sizing";
import { PreviewState, formatPreviewHash, parsePreviewHash } from "../preview-state";
import { useWindowSize } from "../use-window-size";
import { ApPage } from "./ap-page";
import { PreviewControls } from "./preview-controls";
import { SizeReadout } from "./size-readout";

const viewIds = VIEWS.map(view => view.id);
const readHash = () => parsePreviewHash(window.location.hash, viewIds);

/**
 * A view in an iframe at the size the Activity Player would give it, for the settings an author
 * picks in LARA, in this window. The view and the settings are kept in the URL's hash.
 */
export const ApPreview: React.FC = () => {
  const [state, setState] = useState<PreviewState>(readHash);
  const windowSize = useWindowSize();

  useEffect(() => {
    const onHashChange = () => setState(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // replaceState, so trying settings doesn't fill the history, and so it fires no hashchange.
  useEffect(() => {
    const hash = formatPreviewHash(state);
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [state]);

  const view = VIEWS.find(v => v.id === state.viewId) ?? VIEWS[0];
  const size = apSize(state, windowSize);

  return (
    <>
      <header className="ap-preview__controls">
        <h1>Activity Player preview</h1>
        <PreviewControls state={state} views={VIEWS} onChange={setState} />
        <SizeReadout size={size} window={windowSize} />
      </header>
      <ApPage settings={state} size={size} viewId={view.id} viewTitle={view.title} />
    </>
  );
};
