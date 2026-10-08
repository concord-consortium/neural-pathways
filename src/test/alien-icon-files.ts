// Stands in for src/core/alien-icons/alien-icon-files.ts under Jest, which has no require.context.
// It finds the same .svg files, and jest/svg-transform.js turns each into a component, as SVGR
// does in webpack.
import fs from "fs";
import path from "path";
import React from "react";

type SvgComponent = React.FC<React.SVGProps<SVGSVGElement>>;

const folder = path.join(__dirname, "../core/alien-icons");

export const ICON_FILES: ReadonlyMap<string, SvgComponent> = new Map(
  fs.readdirSync(folder)
    .filter(file => file.endsWith(".svg"))
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    .map(file => [path.basename(file, ".svg"), require(path.join(folder, file)).default as SvgComponent]));
