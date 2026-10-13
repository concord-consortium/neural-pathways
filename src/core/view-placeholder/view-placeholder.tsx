import React from "react";
import { AboutButton } from "../about/about-button";
import "./view-placeholder.scss";

interface ViewPlaceholderProps {
  /** The view's root class, as the view had it. */
  className: string;
  title: string;
  /** The view's About text, as markdown. */
  about: string;
}

/**
 * A view that isn't built yet: its title, its About button and a note. About sits at the right of a
 * head row, as in the prototype's unbuilt views, until the view's own layout gives it a place.
 */
export const ViewPlaceholder: React.FC<ViewPlaceholderProps> = ({ className, title, about }) => (
  <div className={className}>
    <h1>{title}</h1>
    <div className="view-placeholder__head">
      <AboutButton title={title} markdown={about} />
    </div>
    <p>Coming soon.</p>
  </div>
);
