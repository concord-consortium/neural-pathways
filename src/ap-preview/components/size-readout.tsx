import React from "react";
import { ApSize, ApWindow } from "../ap-sizing";

/** At most one decimal, with no trailing ".0". */
export function formatPx(n: number): string {
  return String(Math.round(n * 10) / 10);
}

interface SizeReadoutProps {
  size: ApSize;
  window: ApWindow;
}

// The status region (a polite live region) holds the iframe's size and any warning, which change
// with the settings. The window's size is outside it: it changes at every step of dragging the
// window's edge.
export const SizeReadout: React.FC<SizeReadoutProps> = ({ size, window }) => (
  <div className="ap-preview__readout">
    <div role="status">
      <p><strong>Iframe {formatPx(size.iframeWidth)} × {formatPx(size.iframeHeight)} px</strong></p>
      {size.warning && <p className="ap-preview__warning">{size.warning}</p>}
    </div>
    <p>In a {window.width} × {window.height} px window.</p>
    {size.explanation.map(line => <p key={line} className="ap-preview__why">{line}</p>)}
    <p>Views are designed for 1024 × 562 px or less.</p>
    <p>Assumes a Multiple Pages activity and a managed interactive with a name.</p>
  </div>
);
