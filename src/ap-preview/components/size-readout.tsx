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

export const SizeReadout: React.FC<SizeReadoutProps> = ({ size, window }) => (
  <div className="ap-preview__readout">
    <p aria-live="polite">
      <strong>Iframe {formatPx(size.iframeWidth)} × {formatPx(size.iframeHeight)} px</strong>
      {" "}in a {window.width} × {window.height} px window
    </p>
    {size.explanation.map(line => <p key={line} className="ap-preview__why">{line}</p>)}
    {size.warning && <p className="ap-preview__warning">{size.warning}</p>}
    <p>Views are designed for 1024 × 562 px or less.</p>
    <p>Assumes a Multiple Pages activity and a managed interactive with a name.</p>
  </div>
);
