import React from "react";

type SvgComponent = React.FC<React.SVGProps<SVGSVGElement>>;

/** The part of webpack's require.context this module uses. */
interface IconContext {
  keys(): string[];
  (key: string): { default: SvgComponent };
}

// webpack bundles every .svg in this folder, each turned into a React component by SVGR (see
// webpack.config.js), so an icon added here is found by its file name with no other change.
const context = (require as unknown as {
  context(directory: string, useSubdirectories: boolean, filter: RegExp): IconContext;
}).context("./", false, /\.svg$/);

/** Each icon by its file name, which is its attribute's key: "./near_water.svg" is near_water. */
export const ICON_FILES: ReadonlyMap<string, SvgComponent> = new Map(
  context.keys().map(file => [file.replace(/^\.\/(.*)\.svg$/, "$1"), context(file).default]));
