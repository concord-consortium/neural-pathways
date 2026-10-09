import React from "react";
import { ICON_FILES } from "./alien-icon-files";

interface AlienIconProps {
  attributeKey: string;
  /** Width and height, in pixels. */
  size: number;
}

/**
 * An alien attribute's icon, from the prototype's "A1 Full Figure" icon plate: the same species
 * drawn the same way everywhere, in a small scene that says what the observer saw. Each icon is an
 * .svg file in this folder named by its attribute's key, drawn on a 32 × 32 grid with a 1.7 stroke
 * in currentColor, so it takes its parent's color. The icons hold at 24 px and blur below about
 * 14 px. Decorative: an attribute without a file gets nothing.
 */
export const AlienIcon: React.FC<AlienIconProps> = ({ attributeKey, size }) => {
  const Icon = ICON_FILES.get(attributeKey);
  if (!Icon) return null;
  // Each icon component is made once, when its file loads, so looking it up here keeps its identity.
  // eslint-disable-next-line react-hooks/static-components
  return <Icon width={size} height={size} aria-hidden="true" focusable="false" />;
};
