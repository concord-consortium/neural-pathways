import React, { useContext } from "react";

/**
 * True when the view is embedded in the Activity Player as an Interactive. The app shell provides
 * it; views can't import from src/app, so it lives here.
 */
export const InteractiveModeContext = React.createContext(false);

interface ViewTitleProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * A view's title, as the page's h1. In an Interactive it isn't rendered at all: the Activity
 * Player's bar above the iframe names the view, and a visually hidden h1 would make a screen reader
 * read the name twice.
 */
export const ViewTitle: React.FC<ViewTitleProps> = ({ className, children }) => {
  const interactive = useContext(InteractiveModeContext);
  return interactive ? null : <h1 className={className}>{children}</h1>;
};
