import React from "react";
import { findView, VIEWS } from "../views";
import "./view-content.scss";

interface ViewContentProps {
  viewId: string;
}

export const ViewContent: React.FC<ViewContentProps> = ({ viewId }) => {
  const view = findView(viewId);
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
  return <ViewComponent />;
};
