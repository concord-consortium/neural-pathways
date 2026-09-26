import React from "react";
import { VIEWS } from "../views";
import { viewHash } from "../url-state";
import "./view-nav.scss";

interface ViewNavProps {
  selectedId: string;
}

export const ViewNav: React.FC<ViewNavProps> = ({ selectedId }) => (
  <nav className="view-nav" aria-label="Views">
    <ol>
      {VIEWS.map(view => (
        <li key={view.id}>
          <a href={viewHash(view.id)} aria-current={view.id === selectedId ? "page" : undefined}>
            {view.title}
          </a>
        </li>
      ))}
    </ol>
  </nav>
);
